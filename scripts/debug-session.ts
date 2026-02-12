import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.gameSession.findMany({
        include: {
            quiz: {
                include: {
                    questions: true
                }
            },
            players: true,
            currentQuestion: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 1
    });

    if (sessions.length === 0) {
        console.log("No sessions found.");
        return;
    }

    const session = sessions[0];
    console.log("Latest Session:");
    console.log(`ID: ${session.id}`);
    console.log(`Code: ${session.code}`);
    console.log(`Status: ${session.status}`);
    console.log(`Current Question ID: ${session.currentQuestionId}`);
    console.log(`Players: ${session.players.length}`);

    if (session.currentQuestion) {
        console.log(`Current Question Text: ${session.currentQuestion.text}`);
    } else {
        console.log("Current Question is NULL");
    }

    if (session.players.length > 0) {
        console.log("Sample Player:", session.players[0]);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
