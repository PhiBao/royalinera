import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-3xl"
            >
                <span className="inline-block px-4 py-1.5 rounded-full bg-accent-primary/10 text-accent-primary text-sm font-semibold mb-6 border border-accent-primary/20">
                    Now Live on Conway Testnet
                </span>
                <h1>The Future of Event Ticketing is Here</h1>
                <p className="text-xl text-text-secondary mt-6 mb-10 leading-relaxed">
                    Experience fully decentralized, transparent, and instant ticketing.
                    Built on the Linera Protocol for infinite scalability and micro-second latency.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/events" className="btn btn-primary text-lg">
                        Explore Events <ArrowRight size={20} />
                    </Link>
                    <Link to="/events" className="btn btn-secondary text-lg">
                        Create Event
                    </Link>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full"
            >
                <FeatureCard
                    icon={<Zap className="w-8 h-8 text-yellow-400" />}
                    title="Instant Finality"
                    description="Say goodbye to waiting. Transactions on Linera are confirmed in milliseconds."
                />
                <FeatureCard
                    icon={<Shield className="w-8 h-8 text-green-400" />}
                    title="Fraud Proof"
                    description="Every ticket is a unique digital asset secured by the blockchain. No more fakes."
                />
                <FeatureCard
                    icon={<Globe className="w-8 h-8 text-blue-400" />}
                    title="Global Marketplace"
                    description="Buy and sell tickets instantly on our decentralized secondary market."
                />
            </motion.div>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <div className="card text-left hover:bg-white/5 transition-colors">
        <div className="mb-4 p-3 bg-white/5 rounded-lg inline-block">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-text-secondary">{description}</p>
    </div>
);

export default Home;
