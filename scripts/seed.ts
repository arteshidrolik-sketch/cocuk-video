import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Varsayılan ayarları oluştur (eğer yoksa)
  const existingSettings = await prisma.settings.findFirst();
  
  if (!existingSettings) {
    // Varsayılan şifre: 1234
    const defaultPasswordHash = await bcrypt.hash('1234', 10);
    
    await prisma.settings.create({
      data: {
        parentPasswordHash: defaultPasswordHash,
        ageGroup: '3-13',
        predefinedFilters: {
          violence: true,
          fear: true,
          profanity: true,
          adult: true,
        },
        customKeywords: [],
      },
    });
    console.log('Default settings created with password: 1234');
  } else {
    console.log('Settings already exist, skipping...');
  }

  // Örnek onaylı kanallar ekle
  const sampleChannels = [
    { channelId: 'UCvsvdpCJKiRqyxfLZEfhkYw', channelName: 'TRT Çocuk', channelThumbnail: '' },
    { channelId: 'UCaKt_JCPBjk5D2JGH7mmyDw', channelName: 'Rafadan Tayfa', channelThumbnail: '' },
  ];

  for (const channel of sampleChannels) {
    try {
      await prisma.approvedChannel.upsert({
        where: { channelId: channel.channelId },
        update: {},
        create: channel,
      });
      console.log(`Added channel: ${channel.channelName}`);
    } catch (err) {
      console.log(`Channel already exists or error: ${channel.channelName}`);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });