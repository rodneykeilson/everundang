const steps = [
  {
    number: "01",
    title: "Design in minutes",
    body:
      "Pick a template, arrange sections, and preview every change instantly across devices.",
  },
  {
    number: "02",
    title: "Share securely",
    body:
      "Send the owner link to collaborators, publish your invite, and deliver guest links via chat apps.",
  },
  {
    number: "03",
    title: "Track RSVPs",
    body:
      "Monitor responses, export guest lists, and manage attendance from a single dashboard.",
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section className="section" aria-labelledby="workflow-heading">
      <div className="container">
        <header className="section__header">
          <p className="eyebrow">Workflow</p>
          <h2 id="workflow-heading">From idea to live invite in three steps</h2>
          <p className="section__lead">
            Collaborate with your partner or team, publish in a click, and keep guests engaged through
            a delightful experience.
          </p>
        </header>
        <ol className="workflow-grid">
          {steps.map((step) => (
            <li key={step.number} className="workflow-card">
              <span className="workflow-card__index" aria-hidden="true">
                {step.number}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;
