import { initDatabase, pool } from "../db.js";
import { addGuestbookEntry, upsertInvitation } from "../repositories/invitations.js";

async function main() {
  await initDatabase();

  const invitation = await upsertInvitation({
    slug: "rafi-danila",
    headline: "Celebrate with Rafi & Danila",
    couple: {
      brideName: "Danila",
      groomName: "Rafi",
      parents: {
        bride: "Mr. & Mrs. Pratiwi",
        groom: "Mr. & Mrs. Wijaya",
      },
    },
    event: {
      title: "The Wedding Ceremony",
      date: new Date().toISOString().split("T")[0],
      time: "16:00",
      venue: "Aula Serbaguna Harmony",
      address: "Jl. Mawar No. 45, Jakarta",
      mapLink: "https://maps.google.com",
    },
    sections: [
      {
        type: "loveStory",
        title: "Our Journey",
        content: [
          {
            title: "First Meeting",
            date: "2019-03-14",
            description: "We met during a campus event and instantly clicked.",
          },
          {
            title: "The Proposal",
            date: "2024-02-10",
            description: "Under the city lights, Rafi popped the question and Danila said yes!",
          },
        ],
      },
      {
        type: "gallery",
        title: "Memories",
        content: [
          "https://images.unsplash.com/photo-1520854221050-0f4caff449fb",
          "https://images.unsplash.com/photo-1520854221050-0f4caff449fb",
        ],
      },
    ],
    theme: {
      primaryColor: "#a855f7",
      secondaryColor: "#f472b6",
    },
    isPublished: true,
  });

  await addGuestbookEntry(invitation.id, {
    guestName: "Ayu",
    message: "Congratulations! Wishing you a lifetime of happiness together.",
  });

  console.log("Seed data inserted for slug: ", invitation.slug);
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
