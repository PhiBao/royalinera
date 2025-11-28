import "./style.css";
// Owner validation is relaxed: accept non-empty hex (40 or 64 chars) or any non-empty string.

const defaults = {
  endpoint:
    import.meta.env.VITE_SERVICE_URL || "http://localhost:8080/graphql",
  appId:
    import.meta.env.VITE_APP_ID ||
    "40aa1b250b5ec39d04fc462e76f543e2602353c1849eee39649700e5dae3bdc3",
  chainId: import.meta.env.VITE_CHAIN_ID || "",
  owner: import.meta.env.VITE_OWNER_ID || "",
};

const state = {
  endpoint: defaults.endpoint,
  owner: defaults.owner,
  chainId: defaults.chainId,
  appId: defaults.appId,
};

const root = document.querySelector("#app");

root.innerHTML = `
  <div class="hero">
    <div>
      <p class="eyebrow">Conway Testnet • Linera Microchains</p>
      <h1>Ticketing dApp (GraphQL via service)</h1>
      <p class="lede">Point this UI to your hosted linera service GraphQL endpoint on Conway. All ops use your AccountOwner.</p>
      <div class="meta">
        <span class="pill">Service-backed</span>
        <span class="pill">Organizer = your account</span>
        <span class="pill">No WASM client needed</span>
      </div>
    </div>
    <div class="card status">
      <label>Service GraphQL URL</label>
      <div class="inline-field">
        <input id="serviceUrl" value="${defaults.endpoint}" />
        <button class="ghost" id="setEndpoint">Set</button>
      </div>
      <label>Chain ID</label>
      <div class="inline-field">
        <input id="chainId" value="${defaults.chainId}" placeholder="e.g. your requested chain id" />
      </div>
      <label>Application ID</label>
      <div class="inline-field">
        <input id="appId" value="${defaults.appId}" />
        <button class="ghost" id="setAppId">Set</button>
      </div>
      <label>Connect Wallet (AccountOwner)</label>
      <div class="inline-field">
        <input id="owner" placeholder="0x..." value="${defaults.owner}" />
        <button id="connectBtn">Connect</button>
      </div>
      <p class="hint" id="statusText">Set endpoint + owner to start.</p>
    </div>
  </div>

  <nav class="menu">
    <button class="menu-item active" data-target="events">Events</button>
    <button class="menu-item" data-target="mint">Mint Tickets</button>
    <button class="menu-item" data-target="marketplace">Marketplace</button>
    <button class="menu-item" data-target="tickets">My Tickets</button>
  </nav>

  <main>
    <section id="events" class="panel visible">
      <div class="panel-header">
        <div>
          <h2>Events</h2>
          <p>Create events (organizer = your connected account).</p>
        </div>
        <button id="refreshEvents" class="ghost">Refresh events</button>
      </div>
      <div class="card">
        <h3>Create event</h3>
        <form id="createEventForm" class="form">
          <label>Organizer (AccountOwner)
            <input name="organizer" data-owner="true" readonly />
          </label>
          <label>Event ID
            <input name="event_id" placeholder="linera-devcon-2025" required />
          </label>
          <label>Name
            <input name="name" placeholder="Linera DevCon" />
          </label>
          <label>Description
            <textarea name="description" rows="2" placeholder="Short teaser"></textarea>
          </label>
          <label>Venue
            <input name="venue" placeholder="Paris, FR" />
          </label>
          <label>Start time (unix seconds)
            <input name="start_time" type="number" placeholder="1735689600" />
          </label>
          <label>Royalty (bps)
            <input name="royalty_bps" type="number" min="0" max="10000" value="500" />
          </label>
          <label>Max tickets
            <input name="max_tickets" type="number" min="1" value="1000" />
          </label>
          <button type="submit">Create event</button>
        </form>
      </div>
      <div class="card">
        <div class="panel-header">
          <h3>Live events</h3>
          <div class="inline-field">
            <input id="eventFilter" type="text" placeholder="Search by name or venue" />
            <button id="searchEvents" class="ghost">Search</button>
          </div>
        </div>
        <div id="eventsList" class="list"></div>
      </div>
    </section>

    <section id="mint" class="panel">
      <div class="panel-header">
        <div>
          <h2>Mint Tickets</h2>
          <p>Mint seats for an event (organizer = your account).</p>
        </div>
      </div>
      <div class="card">
        <h3>Mint ticket</h3>
        <form id="mintTicketForm" class="form">
          <label>Organizer (AccountOwner)
            <input name="organizer" data-owner="true" readonly />
          </label>
          <label>Event ID
            <input name="event_id" id="mintEventId" required />
          </label>
          <label>Seat / section
            <input name="seat" placeholder="A12" />
          </label>
          <label>Metadata hash (DataBlobHash)
            <input name="blob_hash" placeholder="hex / base64" />
          </label>
          <button type="submit">Mint ticket</button>
        </form>
      </div>
    </section>

    <section id="marketplace" class="panel">
      <div class="panel-header">
        <div>
          <h2>Marketplace</h2>
          <p>List, buy, or cancel with signed operations.</p>
        </div>
        <button id="refreshListings" class="ghost">Refresh listings</button>
      </div>
      <div class="grid two">
        <div class="card">
          <h3>Create listing</h3>
          <form id="createListingForm" class="form">
            <label>Seller (AccountOwner)
              <input name="seller" data-owner="true" readonly />
            </label>
            <label>Ticket ID (base64)
              <input name="ticket_id" required />
            </label>
            <label>Price (u128)
              <input name="price" type="number" min="0" required />
            </label>
            <button type="submit">List ticket</button>
          </form>
        </div>
        <div class="card">
          <h3>Buy / Cancel</h3>
          <form id="buyListingForm" class="form">
            <label>Buyer chain ID
              <input name="chain_id" placeholder="chain id" />
            </label>
            <label>Buyer owner
              <input name="owner" data-owner="true" readonly />
            </label>
            <label>Ticket ID (base64)
              <input name="ticket_id" required />
            </label>
            <label>Price (u128)
              <input name="price" type="number" min="0" required />
            </label>
            <button type="submit">Buy now</button>
          </form>
          <form id="cancelListingForm" class="form subtle">
            <label>Seller (AccountOwner)
              <input name="seller" data-owner="true" readonly />
            </label>
            <label>Ticket ID (base64)
              <input name="ticket_id" required />
            </label>
            <button type="submit" class="ghost">Cancel listing</button>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="panel-header">
          <h3>Active listings</h3>
          <div class="inline-field">
            <input id="listingFilter" type="text" placeholder="Ticket ID or seller" />
            <button id="searchListings" class="ghost">Search</button>
          </div>
        </div>
        <div id="listingList" class="list"></div>
      </div>
    </section>

    <section id="tickets" class="panel">
      <div class="panel-header">
        <div>
          <h2>My Tickets</h2>
          <p>View holdings and transfer/claim across chains.</p>
        </div>
        <div class="inline-field">
          <input id="ownedOwner" type="text" placeholder="AccountOwner (default: signer address)" />
          <button id="refreshOwned" class="ghost">Load owned</button>
        </div>
      </div>
      <div class="grid two">
        <div class="card">
          <h3>Transfer / Claim</h3>
          <form id="transferTicketForm" class="form">
            <label>Seller (AccountOwner)
              <input name="seller" data-owner="true" readonly />
            </label>
            <label>Ticket ID (base64)
              <input name="ticket_id" required />
            </label>
            <label>Buyer chain ID
              <input name="chain_id" placeholder="target chain id" />
            </label>
            <label>Buyer owner
              <input name="owner" placeholder="AccountOwner" />
            </label>
            <label>Sale price (optional)
              <input name="sale_price" type="number" min="0" />
            </label>
            <button type="submit">Transfer on-chain</button>
          </form>
          <form id="claimTicketForm" class="form subtle">
            <label>Source chain ID
              <input name="source_chain" required />
            </label>
            <label>Source owner
              <input name="source_owner" required />
            </label>
            <label>Ticket ID (base64)
              <input name="ticket_id" required />
            </label>
            <label>Target chain ID
              <input name="target_chain" placeholder="default: your chain" />
            </label>
            <label>Target owner
              <input name="target_owner" data-owner="true" readonly />
            </label>
            <label>Sale price (optional)
              <input name="sale_price" type="number" min="0" />
            </label>
            <button type="submit" class="ghost">Claim from remote chain</button>
          </form>
        </div>
        <div class="card">
          <h3>Owned tickets</h3>
          <div id="ownedTickets" class="list"></div>
        </div>
      </div>
    </section>
  </main>
`;

const toastEl = document.querySelector("#toast");
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("visible");
  setTimeout(() => toastEl.classList.remove("visible"), 2600);
}

function showPanel(target) {
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("visible", panel.id === target);
  });
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.target === target);
  });
}

function setOwnerDefaults() {
  document.querySelectorAll('input[data-owner="true"]').forEach((input) => {
    input.value = state.owner;
    input.readOnly = true;
  });
  const ownedOwner = document.getElementById("ownedOwner");
  if (ownedOwner && !ownedOwner.value) {
    ownedOwner.value = state.owner;
  }
}

async function graphqlRequest(query) {
  const res = await fetch(state.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Service returned non-JSON (HTTP ${res.status}) from ${state.endpoint}: ${text.slice(
        0,
        200
      )}`
    );
  }
  if (!res.ok) {
    const msg = body?.errors
      ? body.errors.map((e) => e.message).join("; ")
      : JSON.stringify(body);
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${msg}`);
  }
  if (body.errors) {
    const err = body.errors.map((e) => e.message).join("; ");
    throw new Error(err);
  }
  return body.data;
}

function ensureConnected() {
  if (!state.owner || !state.endpoint) {
    throw new Error("Set service URL and connect your owner first.");
  }
}

function normalizeCollection(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value);
  return [];
}

async function loadEvents(filterText = "") {
  try {
    ensureConnected();
    const data = await graphqlRequest(`
      query {
        events
      }
    `);
    const list = document.getElementById("eventsList");
    list.innerHTML = "";
    const eventsRaw = data.events || {};
    const events = Object.values(eventsRaw).filter((event) => {
      const haystack = `${event.name || ""} ${event.venue || ""} ${event.id?.value || ""}`.toLowerCase();
      return haystack.includes(filterText.toLowerCase());
    });
    if (!events.length) {
      list.innerHTML = `<p class="hint">No events yet.</p>`;
      return;
    }
    events.forEach((event) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <div>
          <div class="title">${event.name || "(unnamed event)"}</div>
          <div class="meta">${event.description || "—"}</div>
        </div>
        <div class="meta">
          <div>Venue: <strong>${event.venue || "TBA"}</strong></div>
          <div>Supply: ${event.mintedTickets ?? 0} / ${event.maxTickets ?? "?"}</div>
          <div>Royalty: ${event.royaltyBps ?? 0} bps</div>
          <div>Organizer: ${event.organizer || "?"}</div>
        </div>
      `;
      list.appendChild(row);
    });
  } catch (err) {
    toast(err.message ?? err);
  }
}

async function loadListings(filterText = "") {
  try {
    ensureConnected();
    const data = await graphqlRequest(`
      query {
        listings
      }
    `);
    const list = document.getElementById("listingList");
    list.innerHTML = "";
    const listingsRaw = data.listings || {};
    const listings = Object.values(listingsRaw).filter((listing) => {
      const haystack = `${listing.ticketId || ""} ${listing.seller || ""}`.toLowerCase();
      return haystack.includes(filterText.toLowerCase());
    });
    if (!listings.length) {
      list.innerHTML = `<p class="hint">No listings.</p>`;
      return;
    }
    listings.forEach((listing) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <div>
          <div class="title">${listing.ticketId}</div>
          <div class="meta">Seller: ${listing.seller}</div>
        </div>
        <div class="meta">
          <div>Price: <strong>${listing.price}</strong></div>
          <div>Status: ${listing.status}</div>
        </div>
      `;
      list.appendChild(row);
    });
  } catch (err) {
    toast(err.message ?? err);
  }
}

async function loadOwned(owner) {
  const target = owner || state.owner;
  if (!target) {
    toast("Connect and provide an owner to load tickets");
    return;
  }
  try {
    ensureConnected();
    const data = await graphqlRequest(`
      query {
        owned_ticket_ids(owner: "${target}")
      }
    `);
    const list = document.getElementById("ownedTickets");
    list.innerHTML = "";
    const items = normalizeCollection(data.owned_ticket_ids);
    if (!items.length) {
      list.innerHTML = `<p class="hint">No tickets for ${target}.</p>`;
      return;
    }
    items.forEach((id) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<div class="title">${id}</div><div class="meta">Ready to transfer/list.</div>`;
      list.appendChild(row);
    });
  } catch (err) {
    toast(err.message ?? err);
  }
}

function j(value) {
  return JSON.stringify(value ?? "");
}

function defaultOwner(input) {
  return state.owner;
}

function defaultChain(input) {
  const v = input?.trim();
  return v && v.length > 0 ? v : "";
}

function bindMenu() {
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", () => showPanel(item.dataset.target));
  });
}

function isValidOwner(owner) {
  if (!owner) return false;
  const hex40 = /^0x[0-9a-fA-F]{40}$/;
  const hex64 = /^0x[0-9a-fA-F]{64}$/;
  return hex40.test(owner) || hex64.test(owner) || owner.length > 0;
}

function bindActions() {
  document.getElementById("connectBtn").addEventListener("click", () => {
    const base = document.getElementById("serviceUrl").value.trim() || defaults.endpoint;
    const appId = document.getElementById("appId").value.trim() || defaults.appId;
    const chainId = document.getElementById("chainId").value.trim() || defaults.chainId;

    state.appId = appId;
    state.chainId = chainId;

    const hasFullPath = /\/chains\/[^/]+\/applications\/[^/]+/.test(base);
    if (hasFullPath) {
      state.endpoint = base;
    } else if (chainId) {
      const baseClean = base.replace(/\/graphql$/, "").replace(/\/$/, "");
      state.endpoint = `${baseClean}/chains/${chainId}/applications/${appId}`;
    } else {
      state.endpoint = base;
    }

    const ownerInput = document.getElementById("owner").value.trim() || state.owner;
    if (!isValidOwner(ownerInput)) {
      toast("Owner is required (use AccountOwner from linera wallet show)");
      return;
    }
    state.owner = ownerInput;
    setOwnerDefaults();
    document.getElementById("owner").value = ownerInput;
    document.getElementById("statusText").textContent = `Owner ${ownerInput}; Endpoint ${state.endpoint}`;
    toast("Owner set. You can now run mutations.");
  });

  document.getElementById("setEndpoint").addEventListener("click", () => {
    state.endpoint = document.getElementById("serviceUrl").value.trim();
    toast(`Endpoint set to ${state.endpoint || defaults.endpoint}`);
  });
  document.getElementById("setAppId").addEventListener("click", () => {
    toast(`AppId set to ${document.getElementById("appId").value}`);
  });

  document.getElementById("refreshEvents").addEventListener("click", () => loadEvents());
  document.getElementById("searchEvents").addEventListener("click", () => {
    const filter = document.getElementById("eventFilter").value;
    loadEvents(filter);
  });
  document.getElementById("refreshListings").addEventListener("click", () => loadListings());
  document.getElementById("searchListings").addEventListener("click", () => {
    const filter = document.getElementById("listingFilter").value;
    loadListings(filter);
  });
  document.getElementById("refreshOwned").addEventListener("click", () => {
    const owner = document.getElementById("ownedOwner").value.trim() || state.owner;
    loadOwned(owner);
  });

  document.getElementById("createEventForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      ensureConnected();
      await graphqlRequest(`
        mutation {
          createEvent(
            organizer: ${j(defaultOwner())}
            eventId: ${j(form.get("event_id"))}
            name: ${j(form.get("name"))}
            description: ${j(form.get("description"))}
            venue: ${j(form.get("venue"))}
            startTime: ${Number(form.get("start_time") || 0)}
            royaltyBps: ${Number(form.get("royalty_bps") || 0)}
            maxTickets: ${Number(form.get("max_tickets") || 0)}
          )
        }
      `);
      toast("Event created");
      loadEvents();
      const eventId = form.get("event_id");
      if (eventId) {
        const mintEvent = document.getElementById("mintEventId");
        if (mintEvent) mintEvent.value = eventId;
      }
      showPanel("mint");
      e.target.reset();
      setOwnerDefaults();
    } catch (err) {
      toast(err.message ?? err);
    }
  });

  document.getElementById("mintTicketForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      ensureConnected();
      await graphqlRequest(`
        mutation {
          mintTicket(
            organizer: ${j(defaultOwner())}
            eventId: ${j(form.get("event_id"))}
            seat: ${j(form.get("seat"))}
            blobHash: ${j(form.get("blob_hash"))}
          )
        }
      `);
      toast("Ticket minted");
      loadEvents();
      e.target.reset();
      setOwnerDefaults();
    } catch (err) {
      toast(err.message ?? err);
    }
  });

  document.getElementById("createListingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      ensureConnected();
      await graphqlRequest(`
        mutation {
          createListing(
            seller: ${j(defaultOwner())}
            ticketId: ${j(form.get("ticket_id"))}
            price: ${j(form.get("price"))}
          )
        }
      `);
      toast("Listing created");
      loadListings();
      e.target.reset();
      setOwnerDefaults();
    } catch (err) {
      toast(err.message ?? err);
    }
  });

  document.getElementById("cancelListingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      ensureConnected();
      await graphqlRequest(`
        mutation {
          cancelListing(
            seller: ${j(defaultOwner())}
            ticketId: ${j(form.get("ticket_id"))}
          )
        }
      `);
      toast("Listing cancelled");
      loadListings();
      e.target.reset();
      setOwnerDefaults();
    } catch (err) {
      toast(err.message ?? err);
    }
  });

  document.getElementById("buyListingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      ensureConnected();
      await graphqlRequest(`
        mutation {
          buyListing(
            buyer: { chainId: ${j(defaultChain(form.get("chain_id")))} , owner: ${j(defaultOwner())} }
            ticketId: ${j(form.get("ticket_id"))}
            price: ${j(form.get("price"))}
          )
        }
      `);
      toast("Buy submitted");
      loadListings();
      e.target.reset();
      setOwnerDefaults();
    } catch (err) {
      toast(err.message ?? err);
    }
  });

  document.getElementById("transferTicketForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      ensureConnected();
      await graphqlRequest(`
        mutation {
          transferTicket(
            seller: ${j(defaultOwner())}
            ticketId: ${j(form.get("ticket_id"))}
            buyerAccount: { chainId: ${j(defaultChain(form.get("chain_id")))} , owner: ${j(form.get("owner"))} }
            salePrice: ${form.get("sale_price") ? j(form.get("sale_price")) : "null"}
          )
        }
      `);
      toast("Transfer sent");
      e.target.reset();
      setOwnerDefaults();
    } catch (err) {
      toast(err.message ?? err);
    }
  });

  document.getElementById("claimTicketForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      ensureConnected();
      await graphqlRequest(`
        mutation {
          claimTicket(
            sourceAccount: { chainId: ${j(form.get("source_chain"))}, owner: ${j(form.get("source_owner"))} }
            ticketId: ${j(form.get("ticket_id"))}
            targetAccount: { chainId: ${j(defaultChain(form.get("target_chain")))} , owner: ${j(defaultOwner())} }
            salePrice: ${form.get("sale_price") ? j(form.get("sale_price")) : "null"}
          )
        }
      `);
      toast("Claim sent");
      e.target.reset();
      setOwnerDefaults();
    } catch (err) {
      toast(err.message ?? err);
    }
  });
}

bindMenu();
bindActions();
