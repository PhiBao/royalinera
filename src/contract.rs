// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::collections::BTreeSet;

use linera_sdk::{
    linera_base_types::{Account, AccountOwner, DataBlobHash, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use ticketing::{
    BalanceEntry, Event, EventId, Listing, ListingStatus, Message, Operation, Ticket, TicketId,
    TicketingAbi, MAX_BPS,
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
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        // Enable better panic messages in the browser for wasm builds when
        // the optional `console_panic` feature is enabled. Do NOT enable
        // this feature when publishing to Linera (it requires JS imports).
        #[cfg(feature = "console_panic")]
        {
            console_error_panic_hook::set_once();
        }

        let state = TicketingState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        TicketingContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        // Validate parameters and clear counters.
        self.runtime.application_parameters();
        self.state.total_royalties.set(0);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        match operation {
            Operation::CreateEvent {
                organizer,
                event_id,
                name,
                description,
                venue,
                start_time,
                royalty_bps,
                max_tickets,
            } => {
                self.runtime
                    .check_account_permission(organizer)
                    .expect("Permission for CreateEvent operation");
                self.create_event(
                    organizer,
                    event_id,
                    name,
                    description,
                    venue,
                    start_time,
                    royalty_bps,
                    max_tickets,
                )
                .await;
            }
            Operation::MintTicket {
                organizer,
                event_id,
                seat,
                blob_hash,
            } => {
                self.runtime
                    .check_account_permission(organizer)
                    .expect("Permission for MintTicket operation");
                self.mint_ticket(organizer, event_id, seat, blob_hash).await;
            }
            Operation::TransferTicket {
                seller,
                ticket_id,
                buyer_account,
                sale_price,
            } => {
                self.runtime
                    .check_account_permission(seller)
                    .expect("Permission for TransferTicket operation");
                let ticket = self.get_ticket(&ticket_id).await;
                assert_eq!(ticket.owner, seller);
                self.transfer(ticket, seller, buyer_account, sale_price)
                    .await;
            }
            Operation::ClaimTicket {
                source_account,
                ticket_id,
                target_account,
                sale_price,
            } => {
                self.runtime
                    .check_account_permission(source_account.owner)
                    .expect("Permission for ClaimTicket operation");

                if source_account.chain_id == self.runtime.chain_id() {
                    let ticket = self.get_ticket(&ticket_id).await;
                    assert_eq!(ticket.owner, source_account.owner);
                    self.transfer(ticket, source_account.owner, target_account, sale_price)
                        .await;
                } else {
                    self.remote_claim(source_account, ticket_id, target_account, sale_price);
                }
            }
            Operation::CreateListing {
                seller,
                ticket_id,
                price,
            } => {
                self.runtime
                    .check_account_permission(seller)
                    .expect("Permission for CreateListing operation");
                self.create_listing(seller, ticket_id, price).await;
            }
            Operation::CancelListing { seller, ticket_id } => {
                self.runtime
                    .check_account_permission(seller)
                    .expect("Permission for CancelListing operation");
                self.cancel_listing(seller, ticket_id).await;
            }
            Operation::BuyListing {
                buyer,
                ticket_id,
                price,
            } => {
                self.runtime
                    .check_account_permission(buyer.owner)
                    .expect("Permission for BuyListing operation");
                self.buy_listing(buyer, ticket_id, price).await;
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::Transfer {
                mut ticket,
                target_account,
                seller,
                sale_price,
            } => {
                let is_bouncing = self
                    .runtime
                    .message_is_bouncing()
                    .expect("Message delivery status is available");
                if !is_bouncing {
                    ticket.owner = target_account.owner;
                    self.finalize_sale(&mut ticket, seller, sale_price)
                        .await;
                }

                self.add_ticket(ticket).await;
            }
            Message::Claim {
                source_account,
                ticket_id,
                target_account,
                sale_price,
            } => {
                self.runtime
                    .check_account_permission(source_account.owner)
                    .expect("Permission for Claim message");
                let ticket = self.get_ticket(&ticket_id).await;
                assert_eq!(source_account.owner, ticket.owner);
                self.transfer(ticket, source_account.owner, target_account, sale_price)
                    .await;
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl TicketingContract {
    async fn create_event(
        &mut self,
        organizer: AccountOwner,
        event_id: EventId,
        name: String,
        description: String,
        venue: String,
        start_time: u64,
        royalty_bps: u16,
        max_tickets: u32,
    ) {
        assert!(
            royalty_bps <= MAX_BPS,
            "Royalty basis points exceed the limit"
        );
        assert!(max_tickets > 0, "Events must allow at least one ticket");

        let exists = self
            .state
            .events
            .get(&event_id)
            .await
            .expect("Failure checking event existence")
            .is_some();
        assert!(!exists, "Event already exists");

        let event = Event {
            id: event_id.clone(),
            organizer,
            name,
            description,
            venue,
            start_time,
            royalty_bps,
            max_tickets,
            minted_tickets: 0,
        };
        self.state
            .events
            .insert(&event_id, event)
            .expect("Error inserting event");
    }

    async fn mint_ticket(
        &mut self,
        organizer: AccountOwner,
        event_id: EventId,
        seat: String,
        blob_hash: DataBlobHash,
    ) {
        // NOTE: Blob validation disabled for browser-only demo
        // The blob hash is stored but not validated - can use any 64-char hex value
        // self.runtime.assert_data_blob_exists(blob_hash);
        
        let event = self
            .state
            .events
            .get(&event_id)
            .await
            .expect("Failure loading event")
            .expect("Event not found");
        assert_eq!(
            event.organizer, organizer,
            "Only the organizer can mint tickets"
        );
        assert!(
            event.minted_tickets < event.max_tickets,
            "Event supply exhausted"
        );

        let ticket_id = Ticket::create_ticket_id(
            &self.runtime.chain_id(),
            &self.runtime.application_id().forget_abi(),
            &event_id,
            &seat,
            &organizer,
            &blob_hash,
            event.minted_tickets,
        )
        .expect("Failed to derive ticket id");

        let ticket = Ticket {
            ticket_id,
            event_id: event_id.clone(),
            event_name: event.name.clone(),
            seat,
            organizer,
            owner: organizer,
            minter: organizer,
            royalty_bps: event.royalty_bps,
            metadata_hash: blob_hash,
            last_sale_price: None,
        };
        
        let minted_tickets = event.minted_tickets;
        drop(event);

        self.add_ticket(ticket).await;
        
        // Update minted count
        let mut event = self
            .state
            .events
            .get_mut(&event_id)
            .await
            .expect("Failure loading event")
            .expect("Event not found");
        event.minted_tickets = minted_tickets + 1;
    }

    async fn transfer(
        &mut self,
        mut ticket: Ticket,
        seller: AccountOwner,
        buyer_account: Account,
        sale_price: Option<u128>,
    ) {
        self.remove_ticket(&ticket).await;
        if buyer_account.chain_id == self.runtime.chain_id() {
            ticket.owner = buyer_account.owner;
            self.finalize_sale(&mut ticket, seller, sale_price).await;
            self.add_ticket(ticket).await;
        } else {
            let message = Message::Transfer {
                ticket,
                target_account: buyer_account,
                seller,
                sale_price,
            };
            self.runtime
                .prepare_message(message)
                .with_tracking()
                .send_to(buyer_account.chain_id);
        }
    }

    fn remote_claim(
        &mut self,
        source_account: Account,
        ticket_id: TicketId,
        target_account: Account,
        sale_price: Option<u128>,
    ) {
        let message = Message::Claim {
            source_account,
            ticket_id,
            target_account,
            sale_price,
        };
        self.runtime
            .prepare_message(message)
            .with_authentication()
            .send_to(source_account.chain_id);
    }

    async fn finalize_sale(
        &mut self,
        ticket: &mut Ticket,
        seller: AccountOwner,
        sale_price: Option<u128>,
    ) {
        if let Some(price) = sale_price {
            if price == 0 {
                return;
            }
            let royalty = price * u128::from(ticket.royalty_bps) / u128::from(MAX_BPS);
            let seller_take = price.saturating_sub(royalty);

            self.credit_balance(ticket.organizer, royalty).await;
            self.credit_balance(seller, seller_take).await;

            let total = self.state.total_royalties.get_mut();
            *total += royalty;
            ticket.last_sale_price = Some(price);
        }
    }

    async fn credit_balance(&mut self, owner: AccountOwner, amount: u128) {
        if amount == 0 {
            return;
        }
        if let Some(balance) = self
            .state
            .royalty_balances
            .get_mut(&owner)
            .await
            .expect("Failure retrieving balance")
        {
            balance.pending += amount;
        } else {
            self.state
                .royalty_balances
                .insert(&owner, BalanceEntry { pending: amount })
                .expect("Failed to insert balance");
        }
    }

    async fn get_ticket(&self, ticket_id: &TicketId) -> Ticket {
        self.state
            .tickets
            .get(ticket_id)
            .await
            .expect("Failure retrieving ticket")
            .expect("Ticket not found")
    }

    async fn add_ticket(&mut self, ticket: Ticket) {
        let token_id = ticket.ticket_id.clone();
        let owner = ticket.owner;

        self.state
            .tickets
            .insert(&token_id, ticket)
            .expect("Error inserting ticket");

        if let Some(owned) = self
            .state
            .owned_ticket_ids
            .get_mut(&owner)
            .await
            .expect("Error fetching tickets for owner")
        {
            owned.insert(token_id);
        } else {
            let mut owned = BTreeSet::new();
            owned.insert(token_id);
            self.state
                .owned_ticket_ids
                .insert(&owner, owned)
                .expect("Error inserting owner entry");
        }
    }

    async fn remove_ticket(&mut self, ticket: &Ticket) {
        self.state
            .tickets
            .remove(&ticket.ticket_id)
            .expect("Failure removing ticket");
        let owned = self
            .state
            .owned_ticket_ids
            .get_mut(&ticket.owner)
            .await
            .expect("Error retrieving owner set")
            .expect("Owner set missing");
        owned.remove(&ticket.ticket_id);
    }

    // Marketplace: create a listing for a ticket owned by `seller`.
    async fn create_listing(&mut self, seller: AccountOwner, ticket_id: TicketId, price: u128) {
        let mut ticket = self.get_ticket(&ticket_id).await;
        assert_eq!(ticket.owner, seller, "Only owner can list a ticket");

        // Ensure no active listing exists
        if let Some(existing) = self
            .state
            .listings
            .get(&ticket_id)
            .await
            .expect("Failure checking listing")
        {
            match existing.status {
                ListingStatus::Active => panic!("Ticket already has an active listing"),
                _ => {}
            }
        }

        let listing = Listing {
            ticket_id: ticket_id.clone(),
            seller,
            price,
            status: ListingStatus::Active,
        };

        self.state
            .listings
            .insert(&ticket_id, listing)
            .expect("Failed to insert listing");
    }

    async fn cancel_listing(&mut self, seller: AccountOwner, ticket_id: TicketId) {
        // Only seller can cancel
        let mut listing = self
            .state
            .listings
            .get_mut(&ticket_id)
            .await
            .expect("Failure loading listing")
            .expect("Listing not found");
        assert_eq!(listing.seller, seller, "Only seller can cancel listing");
        listing.status = ListingStatus::Cancelled;
    }

    async fn buy_listing(&mut self, buyer: Account, ticket_id: TicketId, price: u128) {
        // Load and validate listing
        let mut listing = self
            .state
            .listings
            .get_mut(&ticket_id)
            .await
            .expect("Failure loading listing")
            .expect("Listing not found");

        assert_eq!(listing.status, ListingStatus::Active, "Listing not active");
        assert_eq!(listing.price, price, "Price mismatch");

        // Mark as sold immediately to prevent races
        let seller = listing.seller;
        listing.status = ListingStatus::Sold;

        // Perform transfer: this will finalize sale and credit balances
        let ticket = self.get_ticket(&ticket_id).await;
        assert_eq!(ticket.owner, seller, "Seller no longer owns ticket");

        self.transfer(ticket, seller, buyer, Some(price)).await;
    }
}
