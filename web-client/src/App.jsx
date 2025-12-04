import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LineraProvider } from './contexts/LineraContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Events from './pages/Events';
import Mint from './pages/Mint';
import Marketplace from './pages/Marketplace';
import MyTickets from './pages/MyTickets';

function App() {
  return (
    <LineraProvider>
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
    </LineraProvider>
  );
}

export default App;
