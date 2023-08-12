import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
const prisma = new PrismaClient();

async function main() {
  let event = await prisma.event.findFirst();
  if (!event) {
    event = await prisma.event.create({
      data: {
        title: "Driven.t",
        logoImageUrl: "https://files.driveneducation.com.br/images/logo-rounded.png",
        backgroundImageUrl: "linear-gradient(to right, #FA4098, #FFD77F)",
        startsAt: dayjs().toDate(),
        endsAt: dayjs().add(21, "days").toDate(),
      },
    });
  }

  const ticketTypes = [
    {
      name: "Online",
      price: 10000, 
      isRemote: true,
      includesHotel: false,
    },
    {
      name: "Presencial sem Hotel",
      price: 25000, 
      isRemote: false,
      includesHotel: false,
    },
    {
      name: "Presencial com Hotel",
      price: 60000, 
      isRemote: false,
      includesHotel: true,
    },
  ];

  for (const ticketType of ticketTypes) {
    await prisma.ticketType.create({
      data: ticketType,
    });
  }

  console.log({ event });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
