// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::collections::BTreeSet;

use linera_sdk::{
    linera_base_types::AccountOwner,
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use ticketing::{BalanceEntry, Event, EventId, Ticket, TicketId};

/// All on-chain data required by the ticketing contract and service.
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct TicketingState {
    pub events: MapView<EventId, Event>,
    pub tickets: MapView<TicketId, Ticket>,
    /// Marketplace listings keyed by ticket id.
    pub listings: MapView<TicketId, ticketing::Listing>,
    pub owned_ticket_ids: MapView<AccountOwner, BTreeSet<TicketId>>,
    pub royalty_balances: MapView<AccountOwner, BalanceEntry>,
    pub total_royalties: RegisterView<u128>,
}
