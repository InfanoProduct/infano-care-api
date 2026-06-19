const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const templatesDir = path.join(__dirname, 'src', 'common', 'templates', 'emails');
const outputDir = __dirname;

// Read base template
const baseSource = fs.readFileSync(path.join(templatesDir, 'base.hbs'), 'utf8');
const baseTemplate = Handlebars.compile(baseSource);

// Dummy data for preview
const data = {
  subject: "Preview Email",
  preheaderText: "This is a preview of the email template.",
  parent_name: "Jane Doe",
  quantity: 1,
  order_id: "INF-102938",
  order_date: "June 20, 2026",
  amount: "499.00",
  estimated_delivery: "June 25, 2026",
  view_order_url: "#",
  track_order_url: "#",
  courier_name: "Delhivery",
  tracking_id: "AWB987654321",
  delivery_date: "June 25, 2026",
  tracking_url: "#",
  explore_url: "#",
  payment_method: "Credit Card ending in 4242",
  shipping_address: {
    name: "Jane Doe",
    street: "123 Main Street, Apt 4B",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400001",
    country: "India"
  }
};

const templates = ['order-placed', 'order-shipped', 'order-delivered'];

templates.forEach(name => {
  // Read specific template
  const source = fs.readFileSync(path.join(templatesDir, `${name}.hbs`), 'utf8');
  const template = Handlebars.compile(source);
  
  // Render specific body
  const bodyContent = template(data);
  
  // Inject into base template
  const finalHtml = baseTemplate({ ...data, body: bodyContent });
  
  // Write output
  const outputPath = path.join(outputDir, `preview-${name}.html`);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`Generated: ${outputPath}`);
});
