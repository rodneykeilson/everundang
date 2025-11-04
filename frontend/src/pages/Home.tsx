import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";
import { getInvitations } from "../api/client";

const Home: React.FC = () => {
  const invitationQuery = useQuery({
    queryKey: ["invitations"],
    queryFn: getInvitations,
  });

  const published = invitationQuery.data?.filter((invitation) => invitation.isPublished) ?? [];

  return (
    <div className="site-wrap">
      <Header />

      <main>
        <Hero />
        <Features />
        <HowItWorks />

        <section id="templates" className="container showcase">
          <header>
            <h2>Live Invitations</h2>
            <p className="muted">
              Explore invitations you can create with EverUndang. Share your personalised link instantly.
            </p>
          </header>

          {invitationQuery.isLoading && <p>Loading invitations…</p>}

          <div className="showcase-grid">
            {published.length === 0 && !invitationQuery.isLoading ? (
              <article className="showcase-empty">
                <p>No live invitations yet. Head to the builder to publish your first invitation.</p>
                <Link to="/dashboard" className="nav-link primary">
                  Open builder
                </Link>
              </article>
            ) : (
              published.map((invitation) => (
                <Link to={`/t/${invitation.slug}`} key={invitation.id} className="showcase-card">
                  <span className="badge">/t/{invitation.slug}</span>
                  <h3>{invitation.headline}</h3>
                  <p>
                    {invitation.couple.brideName} &amp; {invitation.couple.groomName}
                  </p>
                  <span className="muted">{new Date(invitation.event.date).toLocaleDateString()}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
