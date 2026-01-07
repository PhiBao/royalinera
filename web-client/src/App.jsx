import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './providers/WalletProvider';
import { GraphQLProvider } from './providers/GraphQLProvider';
import Layout from './components/Layout';
import WalletModal from './components/WalletModalNew';
import { useWallet } from './providers/WalletProvider';
import Home from './pages/Home';
import Events from './pages/EventsNew';
import Mint from './pages/MintNew';
import Marketplace from './pages/MarketplaceNew';
import MyTickets from './pages/MyTicketsNew';

function AppContent() {
  const { showWalletModal, closeWalletModal } = useWallet();
  
  return (
    <>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/mint" element={<Mint />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/my-tickets" element={<MyTickets />} />
          </Routes>
        </Layout>
      </Router>
      <WalletModal isOpen={showWalletModal} onClose={closeWalletModal} />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    <WalletProvider>
      <GraphQLProvider>
        <AppContent />
      </GraphQLProvider>
    </WalletProvider>
  );
}

export default App;
