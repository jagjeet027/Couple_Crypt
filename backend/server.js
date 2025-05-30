import express from 'express';

const app = express();
const PORT = process.env.PORT || 2004;

app.get('/', (req, res) => {
  res.send('Welcome to the Privacy Chat App Backend!');
}
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

