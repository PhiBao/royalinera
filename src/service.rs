// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::{
    collections::{BTreeMap, BTreeSet},
    sync::Arc,
};

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use base64::engine::{general_purpose::STANDARD_NO_PAD, Engine as _};
use linera_sdk::{
    linera_base_types::{DataBlobHash, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};
use ticketing::{EventId, Operation, TicketId, TicketOutput, TicketingAbi, TicketHistory};
use ticketing::ListingStatus;

use self::state::TicketingState;

pub struct TicketingService {
    state: Arc<TicketingState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(TicketingService);

impl WithServiceAbi for TicketingService {
    type Abi = TicketingAbi;
}

#[derive(async_graphql::SimpleObject, Clone, serde::Serialize)]
struct ListingInfo {
    ticket_id: String,
    seller_chain: String,
    seller: String,
    price: String,
    status: String,
    // Wave 6: Add event name for search
    event_name: Option<String>,
}

impl Service for TicketingService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = TicketingState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        TicketingService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
                runtime: self.runtime.clone(),
            },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<TicketingState>,
    runtime: Arc<ServiceRuntime<TicketingService>>,
}

#[Object]
impl QueryRoot {
    /// Get current chain ID (caller identity)
    async fn chain_id(&self) -> String {
        self.runtime.chain_id().to_string()
    }
    
    /// Get the marketplace (hub) chain ID where shared data lives
    async fn marketplace_chain(&self) -> String {
        self.state.marketplace_chain.get().clone()
    }
    
    /// Check if current chain is the marketplace hub
    async fn is_hub(&self) -> bool {
        let current = self.runtime.chain_id().to_string();
        let marketplace = self.state.marketplace_chain.get().clone();
        current == marketplace
    }

    async fn event(&self, event_id: String) -> Option<ticketing::Event> {
        self.state
            .events
            .get(&EventId { value: event_id })
            .await
            .unwrap()
    }

    async fn events(&self) -> BTreeMap<String, ticketing::Event> {
        let mut map = BTreeMap::new();
        self.state
            .events
            .for_each_index_value(|event_id, event| {
                map.insert(event_id.to_owned().value, event.into_owned());
                Ok(())
            })
            .await
            .unwrap();
        map
    }

    async fn ticket(&self, ticket_id: String) -> Option<TicketOutput> {
        let decoded = decode_ticket_id(&ticket_id);
        let ticket = self.state.tickets.get(&decoded).await.unwrap();
        ticket.map(|ticket| {
            let payload = vec![];
            TicketOutput::new(ticket, payload)
        })
    }

    async fn tickets(&self) -> BTreeMap<String, TicketOutput> {
        let mut tickets = BTreeMap::new();
        self.state
            .tickets
            .for_each_index_value(|_ticket_id, ticket| {
                let ticket = ticket.into_owned();
                let payload = vec![];
                let output = TicketOutput::new(ticket, payload);
                tickets.insert(output.ticket_id.clone(), output);
                Ok(())
            })
            .await
            .unwrap();
        tickets
    }

    /// Get all active listings (filters out Cancelled/Sold)
    async fn listings(&self) -> BTreeMap<String, ListingInfo> {
        let mut map = BTreeMap::new();
        
        // First collect all tickets to look up event names
        let mut ticket_event_names: BTreeMap<Vec<u8>, String> = BTreeMap::new();
        self.state
            .tickets
            .for_each_index_value(|ticket_id, ticket| {
                ticket_event_names.insert(ticket_id.id.clone(), ticket.event_name.to_string());
                Ok(())
            })
            .await
            .ok();
        
        self.state
            .listings
            .for_each_index_value(|ticket_id, listing| {
                let listing = listing.into_owned();
                // Only return Active listings
                if listing.status != ListingStatus::Active {
                    return Ok(());
                }
                let ticket_key = STANDARD_NO_PAD.encode(ticket_id.id.clone());
                let event_name = ticket_event_names.get(&ticket_id.id).cloned();
                map.insert(
                    ticket_key.clone(),
                    ListingInfo {
                        ticket_id: ticket_key,
                        seller_chain: listing.seller_chain,
                        seller: listing.seller,
                        price: listing.price.to_string(),
                        status: "Active".to_string(),
                        event_name,
                    },
                );
                Ok(())
            })
            .await
            .unwrap();
        map
    }

    /// Wave 6: Get ticket history (ownership and price history)
    async fn ticket_history(&self, ticket_id: String) -> Option<TicketHistory> {
        let decoded = decode_ticket_id(&ticket_id);
        self.state.ticket_history.get(&decoded).await.unwrap()
    }

    /// Get tickets owned by a specific chain
    async fn owned_ticket_ids(&self, owner_chain: String) -> BTreeSet<String> {
        self.state
            .owned_ticket_ids
            .get(&owner_chain)
            .await
            .unwrap()
            .into_iter()
            .flatten()
            .map(|ticket_id| STANDARD_NO_PAD.encode(ticket_id.id))
            .collect()
    }

    /// Get my tickets (owned by current chain)
    async fn my_tickets(&self) -> BTreeSet<String> {
        let my_chain = self.runtime.chain_id().to_string();
        self.state
            .owned_ticket_ids
            .get(&my_chain)
            .await
            .unwrap()
            .into_iter()
            .flatten()
            .map(|ticket_id| STANDARD_NO_PAD.encode(ticket_id.id))
            .collect()
    }

    /// Get tickets by owner wallet address (for demo mode)
    async fn tickets_by_owner(&self, owner: String) -> Vec<String> {
        let owner_lower = owner.to_lowercase();
        let mut result = Vec::new();
        
        // Iterate through all tickets and filter by owner address
        let ticket_ids = self.state.tickets.indices().await.unwrap();
        for ticket_id in ticket_ids {
            if let Some(ticket) = self.state.tickets.get(&ticket_id).await.unwrap() {
                if ticket.owner.to_lowercase() == owner_lower {
                    result.push(STANDARD_NO_PAD.encode(&ticket_id.id));
                }
            }
        }
        
        result
    }

    /// Get royalty balance for a chain
    async fn royalty_balance(&self, owner_chain: String) -> ticketing::BalanceEntryGraphQL {
        let balance = self
            .state
            .royalty_balances
            .get(&owner_chain)
            .await
            .unwrap()
            .unwrap_or_default();
        (&balance).into()
    }

    async fn royalty_balances(&self) -> BTreeMap<String, ticketing::BalanceEntryGraphQL> {
        let mut balances = BTreeMap::new();
        self.state
            .royalty_balances
            .for_each_index_value(|owner_chain, balance| {
                balances.insert(owner_chain.clone(), (&balance.into_owned()).into());
                Ok(())
            })
            .await
            .unwrap();
        balances
    }
}

struct MutationRoot {
    runtime: Arc<ServiceRuntime<TicketingService>>,
}

#[Object]
impl MutationRoot {
    /// Create a new event (caller becomes organizer)
    /// Wave 6: Added optional image_url, end_time, base_price
    async fn create_event(
        &self,
        event_id: String,
        name: String,
        description: String,
        venue: String,
        start_time: i32,
        royalty_bps: i32,
        max_tickets: i32,
        image_url: Option<String>,
        end_time: Option<i32>,
        base_price: Option<String>,
    ) -> String {
        let operation = Operation::CreateEvent {
            event_id: EventId { value: event_id.clone() },
            name,
            description,
            venue,
            start_time: start_time as u64,
            royalty_bps: royalty_bps as u16,
            max_tickets: max_tickets as u32,
            image_url,
            end_time: end_time.map(|t| t as u64),
            base_price: base_price.and_then(|p| p.parse::<u128>().ok()),
        };
        self.runtime.schedule_operation(&operation);
        format!("Event '{}' creation scheduled", event_id)
    }

    /// Mint a ticket (caller must be event organizer)
    /// owner: wallet address of the minter (for demo mode ownership tracking)
    /// Wave 6: Added optional image_url
    async fn mint_ticket(
        &self,
        event_id: String,
        seat: String,
        blob_hash: String,
        owner: String,
        image_url: Option<String>,
    ) -> String {
        // Parse blob hash from hex string (simple manual hex decode)
        let blob_hash_clean = blob_hash.strip_prefix("0x").unwrap_or(&blob_hash);
        let hash_bytes: Vec<u8> = (0..blob_hash_clean.len())
            .step_by(2)
            .filter_map(|i| {
                blob_hash_clean.get(i..i + 2)
                    .and_then(|s| u8::from_str_radix(s, 16).ok())
            })
            .collect();
        let hash_bytes = if hash_bytes.len() == 32 { hash_bytes } else { vec![0u8; 32] };
        let hash_array: [u8; 32] = hash_bytes.try_into().unwrap_or([0u8; 32]);
        let blob_hash = DataBlobHash(linera_sdk::linera_base_types::CryptoHash::from(hash_array));

        let operation = Operation::MintTicket {
            event_id: EventId { value: event_id.clone() },
            seat: seat.clone(),
            blob_hash,
            owner,
            image_url,
        };
        self.runtime.schedule_operation(&operation);
        format!("Ticket for seat '{}' in event '{}' minting scheduled", seat, event_id)
    }

    /// Transfer a ticket (caller must own it)
    /// new_owner: wallet address of the new owner
    async fn transfer_ticket(
        &self,
        ticket_id: String,
        buyer_chain: String,
        new_owner: String,
        sale_price: Option<String>,
    ) -> String {
        let sale_price = sale_price.and_then(|s| s.parse::<u128>().ok());
        let operation = Operation::TransferTicket {
            ticket_id: decode_ticket_id(&ticket_id),
            buyer_chain,
            new_owner,
            sale_price,
        };
        self.runtime.schedule_operation(&operation);
        "Transfer scheduled".to_string()
    }

    /// Create a listing (caller must own the ticket)
    /// seller: wallet address of the seller (must match ticket.owner)
    async fn create_listing(
        &self,
        ticket_id: String,
        price: String,
        seller: String,
    ) -> String {
        let price = price.parse::<u128>().unwrap_or(0);
        let operation = Operation::CreateListing {
            ticket_id: decode_ticket_id(&ticket_id),
            price,
            seller,
        };
        self.runtime.schedule_operation(&operation);
        "Listing created".to_string()
    }

    /// Cancel a listing (caller must be seller)
    /// seller: wallet address of the seller (must match listing.seller)
    async fn cancel_listing(&self, ticket_id: String, seller: String) -> String {
        let operation = Operation::CancelListing {
            ticket_id: decode_ticket_id(&ticket_id),
            seller,
        };
        self.runtime.schedule_operation(&operation);
        "Listing cancelled".to_string()
    }

    /// Buy a listing (caller becomes buyer)
    /// buyer: wallet address of the buyer
    async fn buy_listing(&self, ticket_id: String, price: String, buyer: String) -> String {
        let price = price.parse::<u128>().unwrap_or(0);
        let operation = Operation::BuyListing {
            ticket_id: decode_ticket_id(&ticket_id),
            price,
            buyer,
        };
        self.runtime.schedule_operation(&operation);
        "Purchase scheduled".to_string()
    }

    /// Claim a ticket from a remote chain
    /// new_owner: wallet address of the new owner
    async fn claim_ticket(
        &self,
        source_chain: String,
        ticket_id: String,
        new_owner: String,
        sale_price: Option<String>,
    ) -> String {
        let sale_price = sale_price.and_then(|s| s.parse::<u128>().ok());
        let operation = Operation::ClaimTicket {
            source_chain,
            ticket_id: decode_ticket_id(&ticket_id),
            new_owner,
            sale_price,
        };
        self.runtime.schedule_operation(&operation);
        "Claim request sent".to_string()
    }

    /// Subscribe to the hub chain's marketplace event stream.
    /// This enables automatic state sync for events, tickets, and listings.
    async fn subscribe_to_hub(&self) -> String {
        let operation = Operation::SubscribeToHub;
        self.runtime.schedule_operation(&operation);
        "Subscription to hub event stream scheduled".to_string()
    }
}

fn decode_ticket_id(ticket_id: &str) -> TicketId {
    TicketId {
        id: STANDARD_NO_PAD.decode(ticket_id).unwrap_or_default(),
    }
}
