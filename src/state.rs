// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::collections::BTreeSet;

use linera_sdk::{
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use ticketing::{BalanceEntry, Event, EventId, Ticket, TicketId};

/// All on-chain data required by the ticketing contract and service.
/// Uses String (chain_id) as identity keys instead of AccountOwner.
/// 
/// Hub-and-Spoke Model:
/// - marketplace_chain: The hub chain ID where shared data lives
/// - events/listings: Only populated on the hub chain
/// - tickets/owned_ticket_ids: On both hub (for reference) and user chains (for ownership)
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct TicketingState {
    /// The marketplace (hub) chain ID - set during instantiation
    pub marketplace_chain: RegisterView<String>,
    /// Events - primarily on hub, synced from user chains
    pub events: MapView<EventId, Event>,
    /// Tickets - on hub for reference, on user chains for ownership
    pub tickets: MapView<TicketId, Ticket>,
    /// Marketplace listings keyed by ticket id - only on hub
    pub listings: MapView<TicketId, ticketing::Listing>,
    /// Tickets owned by each chain (keyed by chain_id string)
    pub owned_ticket_ids: MapView<String, BTreeSet<TicketId>>,
    /// Royalty balances keyed by chain_id string
    pub royalty_balances: MapView<String, BalanceEntry>,
    pub total_royalties: RegisterView<u128>,
}
