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
    linera_base_types::{Account, AccountOwner, DataBlobHash, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};
use ticketing::{EventId, Operation, TicketId, TicketOutput, TicketingAbi};
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
    seller: linera_sdk::linera_base_types::AccountOwner,
    price: String,
    status: String,
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
            // For demo: use empty payload since we're using dummy blob hashes
            // In production, this would call: self.runtime.read_data_blob(ticket.metadata_hash)
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
                // For demo: use empty payload since we're using dummy blob hashes
                // In production, this would call: self.runtime.read_data_blob(ticket.metadata_hash)
                let payload = vec![];
                let output = TicketOutput::new(ticket, payload);
                tickets.insert(output.ticket_id.clone(), output);
                Ok(())
            })
            .await
            .unwrap();
        tickets
    }

    async fn listings(&self) -> BTreeMap<String, ListingInfo> {
        let mut map = BTreeMap::new();
        self.state
            .listings
            .for_each_index_value(|ticket_id, listing| {
                let listing = listing.into_owned();
                let ticket_key = STANDARD_NO_PAD.encode(ticket_id.id.clone());
                let status = match listing.status {
                    ListingStatus::Active => "Active".to_string(),
                    ListingStatus::Cancelled => "Cancelled".to_string(),
                    ListingStatus::Sold => "Sold".to_string(),
                };
                map.insert(
                    ticket_key.clone(),
                    ListingInfo {
                        ticket_id: ticket_key,
                        seller: listing.seller,
                        price: listing.price.to_string(),
                        status,
                    },
                );
                Ok(())
            })
            .await
            .unwrap();
        map
    }

    async fn owned_ticket_ids(&self, owner: AccountOwner) -> BTreeSet<String> {
        self.state
            .owned_ticket_ids
            .get(&owner)
            .await
            .unwrap()
            .into_iter()
            .flatten()
            .map(|ticket_id| STANDARD_NO_PAD.encode(ticket_id.id))
            .collect()
    }

    async fn royalty_balance(&self, owner: AccountOwner) -> ticketing::BalanceEntryGraphQL {
        let balance = self
            .state
            .royalty_balances
            .get(&owner)
            .await
            .unwrap()
            .unwrap_or_default();
        (&balance).into()
    }

    async fn royalty_balances(&self) -> BTreeMap<AccountOwner, ticketing::BalanceEntryGraphQL> {
        let mut balances = BTreeMap::new();
        self.state
            .royalty_balances
            .for_each_index_value(|owner, balance| {
                balances.insert(owner, (&balance.into_owned()).into());
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
    async fn create_event(
        &self,
        organizer: AccountOwner,
        event_id: String,
        name: String,
        description: String,
        venue: String,
        start_time: u64,
        royalty_bps: u16,
        max_tickets: u32,
    ) -> [u8; 0] {
        let operation = Operation::CreateEvent {
            organizer,
            event_id: EventId { value: event_id },
            name,
            description,
            venue,
            start_time,
            royalty_bps,
            max_tickets,
        };
        self.runtime.schedule_operation(&operation);
        []
    }

    async fn mint_ticket(
        &self,
        organizer: AccountOwner,
        event_id: String,
        seat: String,
        blob_hash: DataBlobHash,
    ) -> [u8; 0] {
        let operation = Operation::MintTicket {
            organizer,
            event_id: EventId { value: event_id },
            seat,
            blob_hash,
        };
        self.runtime.schedule_operation(&operation);
        []
    }

    async fn transfer_ticket(
        &self,
        seller: AccountOwner,
        ticket_id: String,
        buyer_account: Account,
        sale_price: Option<String>,
    ) -> [u8; 0] {
        let sale_price = sale_price.and_then(|s| s.parse::<u128>().ok());
        let operation = Operation::TransferTicket {
            seller,
            ticket_id: decode_ticket_id(&ticket_id),
            buyer_account,
            sale_price,
        };
        self.runtime.schedule_operation(&operation);
        []
    }

    async fn create_listing(
        &self,
        seller: AccountOwner,
        ticket_id: String,
        price: String,
    ) -> [u8; 0] {
        let price = price.parse::<u128>().ok();
        let operation = Operation::CreateListing {
            seller,
            ticket_id: decode_ticket_id(&ticket_id),
            price: price.unwrap_or(0),
        };
        self.runtime.schedule_operation(&operation);
        []
    }

    async fn cancel_listing(&self, seller: AccountOwner, ticket_id: String) -> [u8; 0] {
        let operation = Operation::CancelListing {
            seller,
            ticket_id: decode_ticket_id(&ticket_id),
        };
        self.runtime.schedule_operation(&operation);
        []
    }

    async fn buy_listing(&self, buyer: Account, ticket_id: String, price: String) -> [u8; 0] {
        let price = price.parse::<u128>().ok();
        let operation = Operation::BuyListing {
            buyer,
            ticket_id: decode_ticket_id(&ticket_id),
            price: price.unwrap_or(0),
        };
        self.runtime.schedule_operation(&operation);
        []
    }

    async fn claim_ticket(
        &self,
        source_account: Account,
        ticket_id: String,
        target_account: Account,
        sale_price: Option<String>,
    ) -> [u8; 0] {
        let sale_price = sale_price.and_then(|s| s.parse::<u128>().ok());
        let operation = Operation::ClaimTicket {
            source_account,
            ticket_id: decode_ticket_id(&ticket_id),
            target_account,
            sale_price,
        };
        self.runtime.schedule_operation(&operation);
        []
    }
}

fn decode_ticket_id(ticket_id: &str) -> TicketId {
    TicketId {
        id: STANDARD_NO_PAD.decode(ticket_id).unwrap(),
    }
}
