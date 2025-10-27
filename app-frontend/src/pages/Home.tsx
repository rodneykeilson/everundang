import React from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";

/**
 * Landing Home page for everundang.
 * This file composes presentational components only. No backend or interactive
 * form logic is implemented here per the project requirements.
 */
const Home: React.FC = () => {
  return (
    <div className="site-wrap">
      <Header />

      <main>
        <Hero />
        <Features />
        <HowItWorks />
      </main>

      <Footer />
    </div>
  );
};

export default Home;
