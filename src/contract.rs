// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

//! Hub-and-Spoke Cross-Chain Ticketing Contract
//! 
//! Architecture:
//! - The "marketplace chain" (hub) stores all shared data (events, listings)
//! - User chains forward marketplace operations to the hub via messages
//! - Tickets are stored on both hub (reference) and owner chains (ownership)
//! - User chains auto-subscribe to hub's event stream for state sync

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{ChainId, DataBlobHash, StreamUpdate, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use ticketing::{
    Event, EventId, ApplicationParameters, Listing, ListingStatus, 
    Message, Operation, StreamEvent, Ticket, TicketId, TicketingAbi, 
    MAX_BPS, MARKETPLACE_STREAM,
};

use self::state::TicketingState;

pub struct TicketingContract {
    state: TicketingState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(TicketingContract);

impl WithContractAbi for TicketingContract {
    type Abi = TicketingAbi;
}

impl Contract for TicketingContract {
    type Message = Message;
    type InstantiationArgument = ();
    type Parameters = ApplicationParameters;
    type EventValue = StreamEvent;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = TicketingState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        TicketingContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        // Get marketplace chain from application parameters (shared across all chains)
        // If empty, use the creation chain (current chain during instantiation)
        let params = self.runtime.application_parameters();
        let marketplace_chain = if params.marketplace_chain.is_empty() {
            self.runtime.chain_id().to_string()
        } else {
            params.marketplace_chain.clone()
        };
        self.state.marketplace_chain.set(marketplace_chain.clone());
        self.state.total_royalties.set(0);
        
        eprintln!("[INSTANTIATE] Marketplace chain set to: {}", marketplace_chain);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        let caller_chain = self.runtime.chain_id().to_string();
        // Read marketplace_chain from state (set during instantiation) or fallback to params
        let params = self.runtime.application_parameters();
        let marketplace_chain = if params.marketplace_chain.is_empty() {
            // Use stored state if params are empty
            self.state.marketplace_chain.get().clone()
        } else {
            params.marketplace_chain.clone()
        };
        
        // Validate marketplace chain is set
        assert!(!marketplace_chain.is_empty(), "Invalid marketplace chain ID: {}", marketplace_chain);
        
        let is_hub = caller_chain == marketplace_chain;
        eprintln!("[EXECUTE] caller={}, hub={}, is_hub={}", caller_chain, marketplace_chain, is_hub);

        match operation {
            Operation::CreateEvent {
                event_id,
                name,
                description,
                venue,
                start_time,
                royalty_bps,
                max_tickets,
                image_url,
                end_time,
                base_price,
            } => {
                let event = Event {
                    id: event_id.clone(),
                    organizer_chain: caller_chain.clone(),
                    name,
                    description,
                    venue,
                    start_time,
                    royalty_bps,
                    max_tickets,
                    minted_tickets: 0,
                    image_url,
                    end_time,
                    base_price,
                };

                if is_hub {
                    // We're on the hub - create directly
                    self.create_event_local(event).await;
                } else {
                    // Store locally for optimistic display (user sees immediately)
                    self.create_event_local(event.clone()).await;
                    // Also forward to hub for authoritative storage
                    self.forward_to_hub(Message::CreateEventOnHub { event });
                }
            }
            
            Operation::MintTicket {
                event_id,
                seat,
                blob_hash,
                owner,
                image_url,
            } => {
                // Minting happens on the hub (where events live)
                if is_hub {
                    self.mint_ticket(caller_chain, owner, event_id, seat, blob_hash, image_url).await;
                } else {
                    // Forward mint request to hub
                    // The hub will mint the ticket and we'll reference it
                    self.forward_to_hub(Message::MintTicketRequest {
                        minter_chain: caller_chain,
                        owner,
                        event_id,
                        seat,
                        blob_hash,
                        image_url,
                    });
                    eprintln!("[FORWARD] MintTicket forwarded to hub");
                }
            }
            
            Operation::TransferTicket {
                ticket_id,
                buyer_chain,
                new_owner,
                sale_price,
            } => {
                let ticket = self.get_ticket(&ticket_id).await;
                // Ownership check: must match both chain and owner
                assert_eq!(ticket.owner_chain, caller_chain, "Not the ticket owner chain");
                // Note: In demo mode, tickets should be transferred with owner tracking
                self.transfer(ticket, caller_chain, buyer_chain, new_owner, sale_price).await;
            }
            
            Operation::ClaimTicket {
                source_chain,
                ticket_id,
                new_owner,
                sale_price,
            } => {
                if source_chain == caller_chain {
                    // Local claim - no-op
                } else {
                    self.remote_claim(source_chain, ticket_id, caller_chain, new_owner, sale_price);
                }
            }
            
            Operation::CreateListing { ticket_id, price, seller } => {
                if is_hub {
                    // On hub - create directly
                    self.create_listing_local(caller_chain, seller, ticket_id, price).await;
                } else {
                    // Must have ticket locally, then forward to hub
                    let ticket = self.get_ticket(&ticket_id).await;
                    assert_eq!(ticket.owner_chain, caller_chain, "Not the ticket owner chain");
                    // Case-insensitive comparison for wallet addresses
                    assert_eq!(ticket.owner.to_lowercase(), seller.to_lowercase(), "Not the ticket owner");
                    
                    let listing = Listing {
                        ticket_id: ticket_id.clone(),
                        seller_chain: caller_chain.clone(),
                        seller: seller.clone(),
                        price,
                        status: ListingStatus::Active,
                    };
                    
                    // Store listing locally for optimistic display
                    self.state.listings.insert(&ticket_id, listing.clone()).unwrap();
                    
                    // Forward to hub for authoritative storage
                    self.forward_to_hub(Message::CreateListingOnHub { listing });
                }
            }
            
            Operation::CancelListing { ticket_id, seller } => {
                if is_hub {
                    self.cancel_listing_local(caller_chain.clone(), seller, ticket_id).await;
                } else {
                    self.forward_to_hub(Message::CancelListingOnHub {
                        ticket_id,
                        seller_chain: caller_chain,
                        seller,
                    });
                }
            }
            
            Operation::BuyListing { ticket_id, price, buyer } => {
                if is_hub {
                    self.buy_listing_local(caller_chain, buyer, ticket_id, price).await;
                } else {
                    self.forward_to_hub(Message::BuyListingOnHub {
                        ticket_id,
                        buyer_chain: caller_chain,
                        buyer,
                        price,
                    });
                }
            }
            
            Operation::SubscribeToHub => {
                // Subscribe to the hub's marketplace stream for event sync
                if !is_hub {
                    self.subscribe_to_hub();
                    
                    // Request initial state sync from hub
                    let params = self.runtime.application_parameters();
                    if let Ok(hub_chain_id) = params.marketplace_chain.parse::<ChainId>() {
                        self.runtime.send_message(hub_chain_id, Message::RequestSync {
                            requester_chain: caller_chain.clone(),
                        });
                        eprintln!("[SUBSCRIBE] Sent RequestSync to hub");
                    }
                    
                    eprintln!("[SUBSCRIBE] User chain subscribed to hub stream");
                } else {
                    eprintln!("[SUBSCRIBE] Hub chain - no need to subscribe to self");
                }
            }
        }
    }

    async fn execute_message(&mut self, message: Message) -> Self::Response {
        let current_chain = self.runtime.chain_id().to_string();
        let marketplace_chain = self.state.marketplace_chain.get().clone();
        let is_hub = current_chain == marketplace_chain;

        match message {
            Message::Transfer {
                ticket,
                target_chain,
                seller_chain,
                sale_price,
            } => {
                self.receive_ticket(ticket, target_chain, seller_chain, sale_price).await;
            }
            
            Message::Claim {
                source_chain,
                ticket_id,
                requester_chain,
                new_owner,
                sale_price,
            } => {
                let ticket = self.get_ticket(&ticket_id).await;
                assert_eq!(ticket.owner_chain, source_chain, "Ticket not owned by source");
                self.transfer(ticket, source_chain, requester_chain, new_owner, sale_price).await;
            }
            
            // Hub-bound messages - only processed on the hub
            Message::CreateEventOnHub { event } => {
                if is_hub {
                    self.create_event_local(event).await;
                } else {
                    eprintln!("[WARN] CreateEventOnHub received on non-hub chain");
                }
            }
            
            Message::CreateListingOnHub { listing } => {
                if is_hub {
                    // Verify the ticket exists on hub (synced via MintTicketOnHub)
                    let ticket_id = listing.ticket_id.clone();
                    self.state.listings.insert(&ticket_id, listing).unwrap();
                    eprintln!("[HUB] Listing created from remote chain");
                } else {
                    eprintln!("[WARN] CreateListingOnHub received on non-hub chain");
                }
            }
            
            Message::CancelListingOnHub { ticket_id, seller_chain, seller } => {
                if is_hub {
                    self.cancel_listing_local(seller_chain, seller, ticket_id).await;
                }
            }
            
            Message::BuyListingOnHub { ticket_id, buyer_chain, buyer, price } => {
                if is_hub {
                    self.buy_listing_local(buyer_chain, buyer, ticket_id, price).await;
                }
            }
            
            Message::MintTicketOnHub { ticket } => {
                if is_hub {
                    // Store ticket reference on hub
                    let ticket_id = ticket.ticket_id.clone();
                    self.state.tickets.insert(&ticket_id, ticket).unwrap();
                    eprintln!("[HUB] Ticket reference stored from remote mint");
                }
            }
            
            Message::MintTicketRequest { minter_chain, owner, event_id, seat, blob_hash, image_url } => {
                if is_hub {
                    // Hub processes mint request from user chain
                    self.mint_ticket(minter_chain, owner, event_id, seat, blob_hash, image_url).await;
                    eprintln!("[HUB] MintTicketRequest processed from remote chain");
                } else {
                    eprintln!("[WARN] MintTicketRequest received on non-hub chain");
                }
            }
            
            Message::RequestSync { requester_chain } => {
                if is_hub {
                    // Hub receives sync request - send all current state to the requester
                    eprintln!("[HUB] Received sync request from chain: {}", requester_chain);
                    
                    // Collect all events (convert Cow to owned)
                    let mut events = Vec::new();
                    self.state.events.for_each_index_value(|_, event| {
                        events.push(event.into_owned());
                        Ok(())
                    }).await.ok();
                    
                    // Collect all tickets (convert Cow to owned)
                    let mut tickets = Vec::new();
                    self.state.tickets.for_each_index_value(|_, ticket| {
                        tickets.push(ticket.into_owned());
                        Ok(())
                    }).await.ok();
                    
                    // Collect all listings (convert Cow to owned)
                    let mut listings = Vec::new();
                    self.state.listings.for_each_index_value(|_, listing| {
                        listings.push(listing.into_owned());
                        Ok(())
                    }).await.ok();
                    
                    eprintln!("[HUB] Sending InitialStateSync: {} events, {} tickets, {} listings", 
                        events.len(), tickets.len(), listings.len());
                    
                    // Send initial state to the requesting chain
                    if let Ok(target_chain) = requester_chain.parse::<ChainId>() {
                        self.runtime.send_message(target_chain, Message::InitialStateSync {
                            events,
                            tickets,
                            listings,
                        });
                    }
                } else {
                    eprintln!("[WARN] RequestSync received on non-hub chain");
                }
            }
            
            Message::InitialStateSync { events, tickets, listings } => {
                // User chain receives initial state from hub
                eprintln!("[SYNC] Received InitialStateSync: {} events, {} tickets, {} listings",
                    events.len(), tickets.len(), listings.len());
                
                // Store all events locally
                for event in events {
                    let event_id = event.id.clone();
                    self.state.events.insert(&event_id, event).unwrap();
                }
                
                // Store all tickets locally
                for ticket in tickets {
                    let ticket_id = ticket.ticket_id.clone();
                    self.state.tickets.insert(&ticket_id, ticket).unwrap();
                }
                
                // Store all listings locally  
                for listing in listings {
                    let ticket_id = listing.ticket_id.clone();
                    self.state.listings.insert(&ticket_id, listing).unwrap();
                }
                
                eprintln!("[SYNC] InitialStateSync complete - local state updated");
            }
        }
    }

    /// Process incoming events from subscribed streams (sync from hub)
    async fn process_streams(&mut self, updates: Vec<StreamUpdate>) {
        for update in updates {
            // Only process marketplace stream events
            if update.stream_id.stream_name != MARKETPLACE_STREAM.into() {
                continue;
            }
            
            let hub_chain_id = update.chain_id;
            let indices: Vec<u32> = update.new_indices().collect();
            eprintln!("[STREAM] Processing {} new events from hub", indices.len());
            
            for index in indices {
                let event: StreamEvent = self.runtime.read_event(
                    hub_chain_id,
                    MARKETPLACE_STREAM.into(),
                    index,
                );
                
                match event {
                    StreamEvent::EventCreated { event } => {
                        // Sync event to local state
                        let event_id = event.id.clone();
                        self.state.events.insert(&event_id, event).unwrap();
                        eprintln!("[SYNC] Event '{}' synced from hub", event_id.value);
                    }
                    StreamEvent::TicketMinted { ticket } => {
                        // Sync ticket reference to local state
                        let ticket_id = ticket.ticket_id.clone();
                        self.state.tickets.insert(&ticket_id, ticket).unwrap();
                        eprintln!("[SYNC] Ticket synced from hub");
                    }
                    StreamEvent::ListingCreated { listing } | StreamEvent::ListingUpdated { listing } => {
                        // Sync listing to local state
                        let ticket_id = listing.ticket_id.clone();
                        self.state.listings.insert(&ticket_id, listing).unwrap();
                        eprintln!("[SYNC] Listing synced from hub");
                    }
                }
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl TicketingContract {
    /// Helper to subscribe to the hub's marketplace event stream
    fn subscribe_to_hub(&mut self) {
        let params = self.runtime.application_parameters();
        if let Ok(hub_chain_id) = params.marketplace_chain.parse::<ChainId>() {
            let app_id = self.runtime.application_id().forget_abi();
            self.runtime.subscribe_to_events(
                hub_chain_id,
                app_id,
                MARKETPLACE_STREAM.into(),
            );
            eprintln!("[SUBSCRIBE] Subscribed to hub stream: {}", params.marketplace_chain);
        }
    }

    /// Helper to forward a message to the hub chain
    fn forward_to_hub(&mut self, message: Message) {
        // Read marketplace_chain from parameters (always available via app ID)
        let params = self.runtime.application_parameters();
        let marketplace_chain = &params.marketplace_chain;
        if let Ok(hub_chain_id) = marketplace_chain.parse::<ChainId>() {
            self.runtime.send_message(hub_chain_id, message);
            eprintln!("[FORWARD] Message sent to hub: {}", marketplace_chain);
        } else {
            panic!("Invalid marketplace chain ID: {}", marketplace_chain);
        }
    }

    /// Creates an event locally (on hub)
    async fn create_event_local(&mut self, event: Event) {
        assert!(event.royalty_bps <= MAX_BPS, "royalty_bps exceeds maximum");
        assert!(
            self.state.events.get(&event.id).await.unwrap().is_none(),
            "event already exists"
        );
        
        let event_id = event.id.clone();
        self.state.events.insert(&event_id, event.clone()).unwrap();
        
        // Emit event to stream for subscribers to sync
        self.runtime.emit(
            MARKETPLACE_STREAM.into(),
            &StreamEvent::EventCreated { event },
        );
        
        eprintln!("[CREATE_EVENT] Event '{}' created on hub and emitted to stream", event_id.value);
    }

    /// Mints a ticket (on hub where events live)
    async fn mint_ticket(
        &mut self,
        minter_chain: String,
        owner: String,
        event_id: EventId,
        seat: String,
        blob_hash: DataBlobHash,
        image_url: Option<String>,
    ) {
        let event = self
            .state
            .events
            .get(&event_id)
            .await
            .unwrap()
            .expect("event not found");

        assert_eq!(event.organizer_chain, minter_chain, "Only organizer can mint");
        assert!(
            event.minted_tickets < event.max_tickets,
            "max tickets reached"
        );

        let ticket_id = Ticket::create_ticket_id(
            &self.runtime.chain_id(),
            &self.runtime.application_id().forget_abi(),
            &event_id,
            &seat,
            &minter_chain,
            &blob_hash,
            event.minted_tickets,
        )
        .expect("failed to create ticket id");

        // Get current timestamp for minted_at
        let minted_at = self.runtime.system_time().micros() / 1000; // Convert to ms

        let owner_chain = minter_chain.clone();
        let ticket = Ticket {
            ticket_id: ticket_id.clone(),
            event_id: event_id.clone(),
            event_name: event.name.clone(),
            seat,
            organizer_chain: event.organizer_chain.clone(),
            owner_chain: owner_chain.clone(),
            owner: owner.clone(),
            minter_chain: minter_chain.clone(),
            royalty_bps: event.royalty_bps,
            metadata_hash: blob_hash,
            last_sale_price: None,
            image_url,
            minted_at,
        };

        // Store ticket on hub
        self.state.tickets.insert(&ticket_id, ticket.clone()).unwrap();

        // Wave 6: Create initial ownership history record
        use ticketing::{TicketHistory, OwnershipRecord, AcquisitionType};
        let ownership_record = OwnershipRecord {
            owner: owner.clone(),
            owner_chain: owner_chain.clone(),
            acquired_at: minted_at,
            price_paid: None,
            acquisition_type: AcquisitionType::Minted,
        };
        let history = TicketHistory {
            ownership_history: vec![ownership_record],
            price_history: vec![],
        };
        self.state.ticket_history.insert(&ticket_id, history).unwrap();

        // Track ownership on hub
        let mut owned = self
            .state
            .owned_ticket_ids
            .get(&owner_chain)
            .await
            .unwrap()
            .unwrap_or_default();
        owned.insert(ticket_id.clone());
        self.state.owned_ticket_ids.insert(&owner_chain, owned).unwrap();

        // Update event counter
        let mut updated_event = event;
        updated_event.minted_tickets += 1;
        self.state.events.insert(&event_id, updated_event).unwrap();

        // Also send ticket to owner's chain if different from hub
        let marketplace_chain = self.state.marketplace_chain.get().clone();
        if owner_chain != marketplace_chain {
            if let Ok(owner_chain_id) = owner_chain.parse::<ChainId>() {
                self.runtime.send_message(
                    owner_chain_id,
                    Message::Transfer {
                        ticket: ticket.clone(),
                        target_chain: owner_chain.clone(),
                        seller_chain: marketplace_chain,
                        sale_price: None,
                    },
                );
            }
        }

        // Emit ticket to stream for subscribers to sync
        self.runtime.emit(
            MARKETPLACE_STREAM.into(),
            &StreamEvent::TicketMinted { ticket },
        );

        eprintln!("[MINT_TICKET] Ticket minted for event '{}' and emitted to stream", event_id.value);
    }

    /// Returns the ticket with the given ID.
    async fn get_ticket(&self, ticket_id: &TicketId) -> Ticket {
        self.state
            .tickets
            .get(ticket_id)
            .await
            .unwrap()
            .expect("ticket not found")
    }

    /// Transfers a ticket to another chain, distributing royalties if applicable.
    async fn transfer(
        &mut self,
        ticket: Ticket,
        seller_chain: String,
        buyer_chain: String,
        new_owner: String,
        sale_price: Option<u128>,
    ) {
        // Remove from seller's ownership
        let mut seller_owned = self
            .state
            .owned_ticket_ids
            .get(&seller_chain)
            .await
            .unwrap()
            .unwrap_or_default();
        seller_owned.remove(&ticket.ticket_id);
        self.state.owned_ticket_ids.insert(&seller_chain, seller_owned).unwrap();

        // Handle royalty distribution if there's a sale price
        if let Some(price) = sale_price {
            let royalty = (price * ticket.royalty_bps as u128) / MAX_BPS as u128;
            if royalty > 0 {
                let mut organizer_balance = self
                    .state
                    .royalty_balances
                    .get(&ticket.organizer_chain)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                organizer_balance.pending += royalty;
                self.state
                    .royalty_balances
                    .insert(&ticket.organizer_chain, organizer_balance)
                    .unwrap();

                let total = self.state.total_royalties.get() + royalty;
                self.state.total_royalties.set(total);
            }
        }

        // Cancel any existing listing
        if self.state.listings.get(&ticket.ticket_id).await.unwrap().is_some() {
            self.state.listings.remove(&ticket.ticket_id).unwrap();
        }

        // Wave 6: Record ownership transfer in history
        let transfer_time = self.runtime.system_time().micros() / 1000; // Convert to ms
        use ticketing::{TicketHistory, OwnershipRecord, AcquisitionType, PriceHistoryEntry, PriceEventType};
        
        let mut history = self.state.ticket_history
            .get(&ticket.ticket_id)
            .await
            .unwrap()
            .unwrap_or_default();
        
        // Add new ownership record
        let acquisition_type = if sale_price.is_some() {
            AcquisitionType::Purchased
        } else {
            AcquisitionType::Transferred
        };
        let ownership_record = OwnershipRecord {
            owner: new_owner.clone(),
            owner_chain: buyer_chain.clone(),
            acquired_at: transfer_time,
            price_paid: sale_price.map(|p| p.to_string()),
            acquisition_type,
        };
        history.ownership_history.push(ownership_record);
        
        // Add price history entry if this was a sale
        if let Some(price) = sale_price {
            let price_entry = PriceHistoryEntry {
                price: price.to_string(),
                timestamp: transfer_time,
                event_type: PriceEventType::Sold,
            };
            history.price_history.push(price_entry);
        }
        
        self.state.ticket_history.insert(&ticket.ticket_id, history).unwrap();

        // Create updated ticket with new owner
        let mut updated_ticket = ticket.clone();
        updated_ticket.owner_chain = buyer_chain.clone();
        updated_ticket.owner = new_owner.clone();
        updated_ticket.last_sale_price = sale_price;

        // Check if we're on the hub - keep updated ticket reference for ticketsByOwner query
        let marketplace_chain = self.state.marketplace_chain.get().clone();
        let current_chain = self.runtime.chain_id().to_string();
        let is_hub = current_chain == marketplace_chain;
        
        if is_hub {
            // On hub: update ticket in place (don't remove) so ticketsByOwner can find it
            self.state.tickets.insert(&ticket.ticket_id, updated_ticket.clone()).unwrap();
            
            // Add to buyer's ownership on hub
            let mut buyer_owned = self
                .state
                .owned_ticket_ids
                .get(&buyer_chain)
                .await
                .unwrap()
                .unwrap_or_default();
            buyer_owned.insert(ticket.ticket_id.clone());
            self.state.owned_ticket_ids.insert(&buyer_chain, buyer_owned).unwrap();
            
            // Emit updated ticket to stream so other chains can sync
            self.runtime.emit(
                MARKETPLACE_STREAM.into(),
                &StreamEvent::TicketMinted { ticket: updated_ticket.clone() },
            );
            
            eprintln!("[TRANSFER] Hub updated ticket ownership: {} -> {}", ticket.owner, new_owner);
        } else {
            // Not on hub: remove local ticket (it's moving to another chain)
            self.state.tickets.remove(&ticket.ticket_id).unwrap();
        }

        // Parse target chain and send message
        if let Ok(target_chain_id) = buyer_chain.parse::<ChainId>() {
            self.runtime.send_message(
                target_chain_id,
                Message::Transfer {
                    ticket: updated_ticket,
                    target_chain: buyer_chain,
                    seller_chain,
                    sale_price,
                },
            );
        }
    }

    /// Receives a ticket from another chain.
    async fn receive_ticket(
        &mut self,
        ticket: Ticket,
        target_chain: String,
        _seller_chain: String,
        _sale_price: Option<u128>,
    ) {
        // Add to buyer's ownership
        let mut buyer_owned = self
            .state
            .owned_ticket_ids
            .get(&target_chain)
            .await
            .unwrap()
            .unwrap_or_default();
        buyer_owned.insert(ticket.ticket_id.clone());
        self.state.owned_ticket_ids.insert(&target_chain, buyer_owned).unwrap();

        // Store ticket
        let ticket_id = ticket.ticket_id.clone();
        self.state.tickets.insert(&ticket_id, ticket).unwrap();
    }

    /// Sends a claim request to a remote chain.
    fn remote_claim(
        &mut self,
        source_chain: String,
        ticket_id: TicketId,
        requester_chain: String,
        new_owner: String,
        sale_price: Option<u128>,
    ) {
        if let Ok(source_chain_id) = source_chain.parse::<ChainId>() {
            self.runtime.send_message(
                source_chain_id,
                Message::Claim {
                    source_chain: source_chain.clone(),
                    ticket_id,
                    requester_chain,
                    new_owner,
                    sale_price,
                },
            );
        }
    }

    /// Creates a marketplace listing locally (on hub).
    async fn create_listing_local(&mut self, seller_chain: String, seller: String, ticket_id: TicketId, price: u128) {
        // On hub, verify ticket exists
        let ticket = self.get_ticket(&ticket_id).await;
        assert_eq!(ticket.owner_chain, seller_chain, "Not the ticket owner chain");
        // Case-insensitive comparison for wallet addresses
        assert_eq!(ticket.owner.to_lowercase(), seller.to_lowercase(), "Not the ticket owner");

        let listing = Listing {
            ticket_id: ticket_id.clone(),
            seller_chain,
            seller,
            price,
            status: ListingStatus::Active,
        };
        self.state.listings.insert(&ticket_id, listing.clone()).unwrap();
        
        // Wave 6: Record price history for listing
        use ticketing::{TicketHistory, PriceHistoryEntry, PriceEventType};
        let list_time = self.runtime.system_time().micros() / 1000;
        
        let mut history = self.state.ticket_history
            .get(&ticket_id)
            .await
            .unwrap()
            .unwrap_or_default();
        
        // Determine if this is a relist (has previous price history)
        let event_type = if history.price_history.is_empty() {
            PriceEventType::Listed
        } else {
            PriceEventType::Relisted
        };
        
        history.price_history.push(PriceHistoryEntry {
            price: price.to_string(),
            timestamp: list_time,
            event_type,
        });
        self.state.ticket_history.insert(&ticket_id, history).unwrap();
        
        // Emit listing to stream for subscribers to sync
        self.runtime.emit(
            MARKETPLACE_STREAM.into(),
            &StreamEvent::ListingCreated { listing },
        );
        
        eprintln!("[CREATE_LISTING] Listing created on hub and emitted to stream");
    }

    /// Cancels a marketplace listing locally (on hub).
    async fn cancel_listing_local(&mut self, seller_chain: String, seller: String, ticket_id: TicketId) {
        let listing = self
            .state
            .listings
            .get(&ticket_id)
            .await
            .unwrap();
        
        // If listing doesn't exist or is already cancelled/sold, just return
        let listing = match listing {
            Some(l) => l,
            None => {
                eprintln!("[CANCEL_LISTING] Listing not found, skipping");
                return;
            }
        };
        
        if listing.status != ListingStatus::Active {
            eprintln!("[CANCEL_LISTING] Listing already {:?}, skipping", listing.status);
            return;
        }
        
        assert_eq!(listing.seller_chain, seller_chain, "Not the seller chain");
        // Case-insensitive comparison for wallet addresses
        assert_eq!(listing.seller.to_lowercase(), seller.to_lowercase(), "Not the seller");

        let mut updated = listing;
        updated.status = ListingStatus::Cancelled;
        self.state.listings.insert(&ticket_id, updated.clone()).unwrap();
        
        // Emit updated listing to stream
        self.runtime.emit(
            MARKETPLACE_STREAM.into(),
            &StreamEvent::ListingUpdated { listing: updated },
        );
        
        eprintln!("[CANCEL_LISTING] Listing cancelled on hub and emitted to stream");
    }

    /// Buys a marketplace listing locally (on hub).
    async fn buy_listing_local(&mut self, buyer_chain: String, buyer: String, ticket_id: TicketId, price: u128) {
        let listing = self
            .state
            .listings
            .get(&ticket_id)
            .await
            .unwrap()
            .expect("listing not found");
        assert_eq!(listing.status, ListingStatus::Active, "Listing not active");
        assert_eq!(listing.price, price, "Price mismatch");
        // Prevent self-purchase (case-insensitive)
        assert!(listing.seller.to_lowercase() != buyer.to_lowercase(), "Cannot buy your own listing");

        let ticket = self.get_ticket(&ticket_id).await;
        let seller_chain = listing.seller_chain.clone();

        // Mark listing as sold
        let mut updated = listing;
        updated.status = ListingStatus::Sold;
        self.state.listings.insert(&ticket_id, updated.clone()).unwrap();
        
        // Emit updated listing to stream
        self.runtime.emit(
            MARKETPLACE_STREAM.into(),
            &StreamEvent::ListingUpdated { listing: updated },
        );

        // Transfer the ticket to the buyer
        self.transfer(ticket, seller_chain, buyer_chain, buyer, Some(price)).await;
        eprintln!("[BUY_LISTING] Listing purchased on hub and emitted to stream");
    }
}
