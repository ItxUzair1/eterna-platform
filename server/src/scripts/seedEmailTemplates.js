// server/src/scripts/seedEmailTemplates.js
const prisma = require('../config/db');

const DEFAULT_TEMPLATES = [
  {
    name: 'Welcome Email',
    subject: 'Welcome to {{company}}, {{firstName}}!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">Welcome, {{firstName}}!</h1>
      <p>Hello {{leadName}},</p>
      <p>Thank you for your interest in {{company}}. We're excited to have you on board!</p>
      <p>Our team will reach out to you soon at {{email}} or {{phone}} to discuss how we can help you.</p>
      <p>Best regards,<br>The Team</p>
    </div>`
  },
  {
    name: 'Follow Up Email',
    subject: 'Following up on our conversation - {{company}}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">Following Up</h1>
      <p>Hi {{firstName}},</p>
      <p>I wanted to follow up on our recent conversation regarding {{company}}.</p>
      <p>Is there anything specific you'd like to discuss or any questions I can answer?</p>
      <p>Please feel free to reach out to me at {{email}} or call me at {{phone}}.</p>
      <p>Looking forward to hearing from you.</p>
      <p>Best regards,<br>The Team</p>
    </div>`
  },
  {
    name: 'Thank You Email',
    subject: 'Thank you for contacting us, {{firstName}}!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">Thank You!</h1>
      <p>Dear {{leadName}},</p>
      <p>Thank you for reaching out to {{company}}. We appreciate you taking the time to contact us.</p>
      <p>We have received your inquiry and one of our team members will get back to you shortly.</p>
      <p>In the meantime, if you have any urgent questions, please don't hesitate to contact us at {{email}} or {{phone}}.</p>
      <p>Thank you again,<br>The Team</p>
    </div>`
  },
  {
    name: 'Product Introduction',
    subject: 'Introducing our solutions for {{company}}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">Solutions for Your Business</h1>
      <p>Hi {{firstName}},</p>
      <p>I hope this email finds you well. I wanted to reach out regarding {{company}}.</p>
      <p>We specialize in helping businesses like yours achieve their goals. Our comprehensive solutions are designed to streamline your operations and drive growth.</p>
      <p>Would you be available for a brief call this week to discuss how we can help {{company}}?</p>
      <p>You can reach me directly at {{email}} or {{phone}}.</p>
      <p>Best regards,<br>The Team</p>
    </div>`
  },
  {
    name: 'Meeting Confirmation',
    subject: 'Meeting Confirmation - {{company}}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">Meeting Confirmation</h1>
      <p>Hi {{firstName}},</p>
      <p>This email confirms our upcoming meeting regarding {{company}}.</p>
      <p>We're looking forward to discussing how we can assist you and your team.</p>
      <p>If you need to reschedule or have any questions before our meeting, please contact us at {{email}} or {{phone}}.</p>
      <p>See you soon!</p>
      <p>Best regards,<br>The Team</p>
    </div>`
  },
  {
    name: 'Re-engagement Email',
    subject: 'We miss you, {{firstName}}! Let\'s reconnect',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">Let's Reconnect</h1>
      <p>Hi {{firstName}},</p>
      <p>It's been a while since we last connected, and we wanted to reach out to see how things are going at {{company}}.</p>
      <p>We've been working on some exciting updates and solutions that we think could be valuable for your business.</p>
      <p>Would you be open to a quick conversation? I'd love to catch up and see how we can help.</p>
      <p>You can reach me at {{email}} or {{phone}}.</p>
      <p>Looking forward to reconnecting!</p>
      <p>Best regards,<br>The Team</p>
    </div>`
  },
  {
    name: 'Cold Outreach',
    subject: 'Quick question about {{company}}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">Quick Question</h1>
      <p>Hi {{firstName}},</p>
      <p>I came across {{company}} and was impressed by what you're doing.</p>
      <p>I have a quick question: are you currently looking for solutions to [insert specific problem/solution]?</p>
      <p>We help businesses like {{company}} achieve [specific benefit]. I'd love to share a quick case study if you're interested.</p>
      <p>Would you be open to a brief 15-minute call this week?</p>
      <p>Best regards,<br>The Team</p>
    </div>`
  },
  {
    name: 'Proposal Follow Up',
    subject: 'Following up on our proposal for {{company}}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">Proposal Follow Up</h1>
      <p>Hi {{firstName}},</p>
      <p>I wanted to follow up on the proposal we sent for {{company}}.</p>
      <p>Have you had a chance to review it? I'm happy to answer any questions you might have or discuss any specific aspects in more detail.</p>
      <p>Please feel free to reach out to me at {{email}} or {{phone}} at your convenience.</p>
      <p>Looking forward to hearing from you.</p>
      <p>Best regards,<br>The Team</p>
    </div>`
  }
];

async function seedTemplatesForTenant(tenantId) {
  console.log(`\nSeeding email templates for tenant ${tenantId}...`);
  
  for (const template of DEFAULT_TEMPLATES) {
    try {
      await prisma.mailTemplate.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: template.name
          }
        },
        update: {
          subject: template.subject,
          body: template.body
        },
        create: {
          tenantId,
          name: template.name,
          subject: template.subject,
          body: template.body
        }
      });
      console.log(`✓ Created/Updated template: ${template.name}`);
    } catch (err) {
      console.error(`✗ Failed to create template ${template.name}:`, err.message);
    }
  }
  
  console.log(`\nEmail templates seeding completed for tenant ${tenantId}!`);
}

async function seedAllTenants() {
  const tenants = await prisma.tenant.findMany();
  
  if (tenants.length === 0) {
    console.log('No tenants found. Please create a tenant first.');
    return;
  }
  
  console.log(`Found ${tenants.length} tenant(s).`);
  
  for (const tenant of tenants) {
    await seedTemplatesForTenant(tenant.id);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Seed for specific tenant ID
    const tenantId = parseInt(args[0]);
    if (isNaN(tenantId)) {
      console.error('Invalid tenant ID. Please provide a number.');
      process.exit(1);
    }
    await seedTemplatesForTenant(tenantId);
  } else {
    // Seed for all tenants
    await seedAllTenants();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

