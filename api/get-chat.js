import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    // Serve vera-chat.html to all users (mobile and desktop)
    // This is the production-grade chat interface
    const filePath = path.join(process.cwd(), 'public', 'vera-pro.html');
    const content = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).end(content);
  } catch (error) {
    console.error('Error serving chat:', error);
    res.status(500).end(JSON.stringify({ error: 'Failed to serve chat' }));
  }
}
