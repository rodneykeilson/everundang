import React from "react";
import Card from "./Card";

const Features: React.FC = () => {
  return (
    <section className="container">
      <h2 style={{ marginTop: 12 }}>Features</h2>
      <p className="muted">All the tools you need to create a memorable wedding invitation.</p>

      <div className="card-grid" style={{ marginTop: 12 }}>
        <Card title="Fast Setup">Create beautiful invitations in minutes with intuitive defaults.</Card>
        <Card title="Customizable Templates">Modern templates with simple customization for Indonesian traditions.</Card>
        <Card title="RSVP & Guestbook">Collect RSVPs and keep a guestbook — neatly organized.</Card>
        <Card title="Realtime Editing Dashboard">Edit and preview changes instantly (placeholder).</Card>
      </div>
    </section>
  );
};

export default Features;
