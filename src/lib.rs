// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! ABI of the Event Ticketing example with embedded royalty accounting.
 *  Uses chain_id as identity - no owner parameters needed in mutations.
 *  
 *  Hub-and-Spoke Architecture:
 *  - The "marketplace chain" (where app was created) is the hub
 *  - All shared data (events, listings) is stored on the hub
 *  - User chains forward marketplace operations to the hub via messages
 *  - User chains subscribe to hub event streams for automatic state sync
 */

use async_graphql::{InputObject, Request, Response, SimpleObject};
use linera_sdk::{
    linera_base_types::{
        ApplicationId, ChainId, ContractAbi, DataBlobHash, ServiceAbi,
    },
    ToBcsBytes,
};
use serde::{Deserialize, Serialize};

/// Stream name for marketplace events (events, tickets, listings)
pub const MARKETPLACE_STREAM: &[u8] = b"marketplace";

/// Maximum number of basis points used for royalty splits.
pub const MAX_BPS: u16 = 10_000;

/// Application parameters - shared across all chains
/// Contains the marketplace (hub) chain ID where shared data lives
#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct ApplicationParameters {
    /// The chain ID where shared marketplace data lives (usually the creation chain)
    pub marketplace_chain: String,
}

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
/// NOTE: No owner/organizer parameters - the contract derives the caller from runtime.chain_id()
#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    /// Registers a new event with royalty terms.
    /// Caller (from chain_id) becomes the organizer.
    CreateEvent {
        event_id: EventId,
        name: String,
        description: String,
        venue: String,
        start_time: u64,
        royalty_bps: u16,
        max_tickets: u32,
    },
    /// Mints a ticket for a seat within an event.
    /// Caller must be the event organizer.
    MintTicket {
        event_id: EventId,
        seat: String,
        blob_hash: DataBlobHash,
    },
    /// Transfers a ticket that currently resides on this chain.
    /// Caller must own the ticket.
    TransferTicket {
        ticket_id: TicketId,
        buyer_chain: String,
        sale_price: Option<u128>,
    },
    /// Claims a ticket that resides on a remote chain.
    ClaimTicket {
        source_chain: String,
        ticket_id: TicketId,
        sale_price: Option<u128>,
    },
    /// Create a marketplace listing for a ticket owned by the caller.
    CreateListing {
        ticket_id: TicketId,
        price: u128,
    },
    /// Cancel an existing listing (only seller).
    CancelListing {
        ticket_id: TicketId,
    },
    /// Buy an active listing.
    BuyListing {
        ticket_id: TicketId,
        price: u128,
    },
    /// Subscribe to the hub chain's marketplace event stream.
    /// This enables the user's chain to receive events, tickets, and listings from the hub.
    SubscribeToHub,
}

/// Cross-chain messages emitted by the ticketing contract.
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Transfers a ticket to the target chain
    Transfer {
        ticket: Ticket,
        target_chain: String,
        seller_chain: String,
        sale_price: Option<u128>,
    },
    /// Requests a remote chain to release the ticket
    Claim {
        source_chain: String,
        ticket_id: TicketId,
        requester_chain: String,
        sale_price: Option<u128>,
    },
    
    // === Hub-bound messages (from user chains to marketplace chain) ===
    
    /// Request initial state sync from hub (user chain → hub)
    RequestSync {
        requester_chain: String,
    },
    /// Initial state sync from hub (hub → user chain)
    /// Sends ALL current events, tickets, and listings to the subscribing user
    InitialStateSync {
        events: Vec<Event>,
        tickets: Vec<Ticket>,
        listings: Vec<Listing>,
    },
    /// Forward event creation to the hub
    CreateEventOnHub {
        event: Event,
    },
    /// Forward listing creation to the hub
    CreateListingOnHub {
        listing: Listing,
    },
    /// Forward listing cancellation to the hub
    CancelListingOnHub {
        ticket_id: TicketId,
        seller_chain: String,
    },
    /// Forward listing purchase to the hub
    BuyListingOnHub {
        ticket_id: TicketId,
        buyer_chain: String,
        price: u128,
    },
    /// Forward mint ticket request to hub (hub does actual minting)
    MintTicketRequest {
        minter_chain: String,
        event_id: EventId,
        seat: String,
        blob_hash: DataBlobHash,
    },
    /// Mint ticket notification to hub (for tracking)
    MintTicketOnHub {
        ticket: Ticket,
    },
}

/// Event metadata tracked on-chain.
#[derive(Debug, Serialize, Deserialize, Clone, SimpleObject, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: EventId,
    /// Stored as chain_id string for easy comparison
    pub organizer_chain: String,
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
    /// Organizer chain for royalty distribution
    pub organizer_chain: String,
    /// Current owner chain
    pub owner_chain: String,
    /// Minter chain
    pub minter_chain: String,
    pub royalty_bps: u16,
    pub metadata_hash: DataBlobHash,
    pub last_sale_price: Option<u128>,
}

/// Marketplace listing for a ticket.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Listing {
    pub ticket_id: TicketId,
    /// Seller chain
    pub seller_chain: String,
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
    pub organizer_chain: String,
    pub owner_chain: String,
    pub minter_chain: String,
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
            organizer_chain: ticket.organizer_chain,
            owner_chain: ticket.owner_chain,
            minter_chain: ticket.minter_chain,
            royalty_bps: ticket.royalty_bps,
            payload,
            last_sale_price: ticket.last_sale_price.map(|p| p.to_string()),
        }
    }
}

/// Simple balance entry representing the pending payout for any chain.
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
        minter_chain: &str,
        metadata_hash: &DataBlobHash,
        event_mint_index: u32,
    ) -> Result<TicketId, bcs::Error> {
        use sha3::Digest as _;
        let mut hasher = sha3::Sha3_256::new();
        hasher.update(chain_id.to_bcs_bytes()?);
        hasher.update(application_id.to_bcs_bytes()?);
        hasher.update(event_id.value.as_bytes());
        hasher.update(seat.as_bytes());
        hasher.update(minter_chain.as_bytes());
        hasher.update(metadata_hash.to_bcs_bytes()?);
        hasher.update(event_mint_index.to_bcs_bytes()?);

        Ok(TicketId {
            id: hasher.finalize().to_vec(),
        })
    }
}

/// Event values emitted to the marketplace stream for cross-chain sync.
/// User chains subscribe to this stream to receive updates from the hub.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum StreamEvent {
    /// A new event was created on the hub
    EventCreated { event: Event },
    /// A ticket was minted on the hub
    TicketMinted { ticket: Ticket },
    /// A listing was created on the hub  
    ListingCreated { listing: Listing },
    /// A listing was updated (cancelled/sold) on the hub
    ListingUpdated { listing: Listing },
}
