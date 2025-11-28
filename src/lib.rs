// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! ABI of the Event Ticketing example with embedded royalty accounting. */

use async_graphql::{InputObject, Request, Response, SimpleObject};
use linera_sdk::{
    linera_base_types::{
        Account, AccountOwner, ApplicationId, ChainId, ContractAbi, DataBlobHash, ServiceAbi,
    },
    ToBcsBytes,
};
use serde::{Deserialize, Serialize};

/// Maximum number of basis points used for royalty splits.
pub const MAX_BPS: u16 = 10_000;

/// Event identifier.
#[derive(
    Debug, Default, Serialize, Deserialize, Clone, PartialEq, Eq, Ord, PartialOrd, SimpleObject,
    InputObject,
)]
#[graphql(input_name = "EventIdInput")]
pub struct EventId {
    pub value: String,
}

/// Ticket identifier stored as raw bytes and shared via base64.
#[derive(
    Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Ord, PartialOrd, SimpleObject, InputObject,
)]
#[graphql(input_name = "TicketIdInput")]
pub struct TicketId {
    pub id: Vec<u8>,
}

pub struct TicketingAbi;

impl ContractAbi for TicketingAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for TicketingAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Operations supported by the ticketing contract.
#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    /// Registers a new event with royalty terms.
    CreateEvent {
        organizer: AccountOwner,
        event_id: EventId,
        name: String,
        description: String,
        venue: String,
        start_time: u64,
        royalty_bps: u16,
        max_tickets: u32,
    },
    /// Mints a ticket for a seat within an event.
    MintTicket {
        organizer: AccountOwner,
        event_id: EventId,
        seat: String,
        blob_hash: DataBlobHash,
    },
    /// Transfers a ticket that currently resides on this chain.
    TransferTicket {
        seller: AccountOwner,
        ticket_id: TicketId,
        buyer_account: Account,
        sale_price: Option<u128>,
    },
    /// Claims a ticket that resides on a remote chain.
    ClaimTicket {
        source_account: Account,
        ticket_id: TicketId,
        target_account: Account,
        sale_price: Option<u128>,
    },
    /// Create a marketplace listing for a ticket owned by the caller.
    CreateListing {
        seller: AccountOwner,
        ticket_id: TicketId,
        price: u128,
    },
    /// Cancel an existing listing (only seller).
    CancelListing {
        seller: AccountOwner,
        ticket_id: TicketId,
    },
    /// Buy an active listing.
    BuyListing {
        buyer: Account,
        ticket_id: TicketId,
        price: u128,
    },
}

/// Cross-chain messages emitted by the ticketing contract.
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Transfers a ticket to the target account, bouncing to seller if delivery fails.
    Transfer {
        ticket: Ticket,
        target_account: Account,
        seller: AccountOwner,
        sale_price: Option<u128>,
    },
    /// Requests a remote chain to release the ticket and forward it to the target account.
    Claim {
        source_account: Account,
        ticket_id: TicketId,
        target_account: Account,
        sale_price: Option<u128>,
    },
}

/// Event metadata tracked on-chain.
#[derive(Debug, Serialize, Deserialize, Clone, SimpleObject, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: EventId,
    pub organizer: AccountOwner,
    pub name: String,
    pub description: String,
    pub venue: String,
    pub start_time: u64,
    pub royalty_bps: u16,
    pub max_tickets: u32,
    pub minted_tickets: u32,
}

/// Ticket metadata alongside royalty bookkeeping.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Ticket {
    pub ticket_id: TicketId,
    pub event_id: EventId,
    pub event_name: String,
    pub seat: String,
    pub organizer: AccountOwner,
    pub owner: AccountOwner,
    pub minter: AccountOwner,
    pub royalty_bps: u16,
    pub metadata_hash: DataBlobHash,
    pub last_sale_price: Option<u128>,
}

/// Marketplace listing for a ticket.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Listing {
    pub ticket_id: TicketId,
    pub seller: AccountOwner,
    pub price: u128,
    pub status: ListingStatus,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub enum ListingStatus {
    Active,
    Cancelled,
    Sold,
}

/// Human-friendly output of a ticket (with payload bytes).
#[derive(Debug, Serialize, Deserialize, Clone, SimpleObject, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TicketOutput {
    pub ticket_id: String,
    pub event_id: EventId,
    pub event_name: String,
    pub seat: String,
    pub organizer: AccountOwner,
    pub owner: AccountOwner,
    pub minter: AccountOwner,
    pub royalty_bps: u16,
    pub payload: Vec<u8>,
    pub last_sale_price: Option<String>,
}

impl TicketOutput {
    pub fn new(ticket: Ticket, payload: Vec<u8>) -> Self {
        use base64::engine::{general_purpose::STANDARD_NO_PAD, Engine as _};
        let ticket_id = STANDARD_NO_PAD.encode(ticket.ticket_id.id.clone());
        Self {
            ticket_id,
            event_id: ticket.event_id,
            event_name: ticket.event_name,
            seat: ticket.seat,
            organizer: ticket.organizer,
            owner: ticket.owner,
            minter: ticket.minter,
            royalty_bps: ticket.royalty_bps,
            payload,
            last_sale_price: ticket.last_sale_price.map(|p| p.to_string()),
        }
    }
}

/// Simple balance entry representing the pending payout for any account.
#[derive(
    Debug, Default, Serialize, Deserialize, Clone, PartialEq, Eq, Ord, PartialOrd,
)]
#[serde(rename_all = "camelCase")]
pub struct BalanceEntry {
    pub pending: u128,
}

/// GraphQL-compatible balance entry.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, PartialEq, Eq)]
pub struct BalanceEntryGraphQL {
    pub pending: String,
}

impl From<&BalanceEntry> for BalanceEntryGraphQL {
    fn from(entry: &BalanceEntry) -> Self {
        Self {
            pending: entry.pending.to_string(),
        }
    }
}

impl Ticket {
    /// Deterministically derives a ticket ID using several entropy sources.
    #[allow(clippy::too_many_arguments)]
    pub fn create_ticket_id(
        chain_id: &ChainId,
        application_id: &ApplicationId,
        event_id: &EventId,
        seat: &str,
        minter: &AccountOwner,
        metadata_hash: &DataBlobHash,
        event_mint_index: u32,
    ) -> Result<TicketId, bcs::Error> {
        use sha3::Digest as _;
        let mut hasher = sha3::Sha3_256::new();
        hasher.update(chain_id.to_bcs_bytes()?);
        hasher.update(application_id.to_bcs_bytes()?);
        hasher.update(event_id.value.as_bytes());
        hasher.update(seat.as_bytes());
        hasher.update(minter.to_bcs_bytes()?);
        hasher.update(metadata_hash.to_bcs_bytes()?);
        hasher.update(event_mint_index.to_bcs_bytes()?);

        Ok(TicketId {
            id: hasher.finalize().to_vec(),
        })
    }
}
