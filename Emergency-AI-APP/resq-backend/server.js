import 'dotenv/config';
import app from './src/app.js';
import connectDatabase from './src/config/database.js';

const port = process.env.PORT || 3001;

await connectDatabase();
app.listen(port, () => console.log(`RESQ API listening on http://localhost:${port}`));
