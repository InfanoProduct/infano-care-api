import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

// Define the absolute path to the templates directory
const TEMPLATES_DIR = path.join(process.cwd(), 'src', 'common', 'templates', 'emails');

/**
 * Compiles a specific template and wraps it in the base layout
 * @param templateName The name of the template file without the .hbs extension
 * @param data The dynamic data to inject into the template
 * @returns The final HTML string
 */
export const compileEmailTemplate = async (templateName: string, data: Record<string, any>): Promise<string> => {
  try {
    // 1. Read the base layout and the specific template
    const baseLayoutSource = await fs.readFile(path.join(TEMPLATES_DIR, 'base.hbs'), 'utf-8');
    const templateSource = await fs.readFile(path.join(TEMPLATES_DIR, `${templateName}.hbs`), 'utf-8');

    // 2. Compile both
    const baseTemplate = handlebars.compile(baseLayoutSource);
    const innerTemplate = handlebars.compile(templateSource);

    // 3. Render the inner content
    const innerHtml = innerTemplate(data);

    // 4. Render the base layout passing the inner HTML and global data (like subject/preheader)
    const finalHtml = baseTemplate({
      IMAGE_BASE_URL: process.env.IMAGE_BASE_URL || 'https://api.infano.care/uploads',
      ...data,
      body: innerHtml,
    });

    return finalHtml;
  } catch (error) {
    console.error(`Error compiling email template '${templateName}':`, error);
    throw new Error(`Failed to compile email template ${templateName}`);
  }
};
