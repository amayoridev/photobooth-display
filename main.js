// Required dependencies
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser')
const fs = require('fs');
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 80;

app.use(express.json()); // Ensure this is present and placed before your routes
app.use(express.urlencoded({ extended: false })); // This handles form data

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const PhotoSchema = new mongoose.Schema({
  url: String,
  uploadedAt: { type: Date, default: Date.now },
});
const Photo = mongoose.model('Photo', PhotoSchema);

// Multer setup for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes

// Get all photos
app.get('/photos', async (req, res) => {
  try {
    const photos = await Photo.find();
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Upload photo to local storage
app.post('/upload', upload.single('photo'), async (req, res) => {
  const {authId} = req.body;
  if(authId === process.env.sCode){
    try {
        const localUrl = `/uploads/${req.file.filename}`;
        const newPhoto = new Photo({ url: localUrl });
        await newPhoto.save();
        res.json({ message: 'Uploaded locally', url: localUrl });
      } catch (error) {
        res.status(500).json({ error: 'Failed to upload photo' });
      }
  } else{
    res.send(`Unauthorized`)
  }
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Homepage
app.get('/', async (req, res) => {
  try {
    const photos = await Photo.find();
    let photoElements = photos.map(photo => `<div class="photo-item"><img src="${photo.url}" alt="Photo"></div>`).join('');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PhotoBooth</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
          }
          .gallery {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
          }
          .photo-item {
            flex: 1 1 calc(25% - 10px);
            max-width: calc(25% - 10px);
          }
          .photo-item img {
            width: 100%;
            height: auto;
            border-radius: 5px;
          }
          @media (max-width: 768px) {
            .photo-item {
              flex: 1 1 calc(50% - 10px);
              max-width: calc(50% - 10px);
            }
          }
          @media (max-width: 480px) {
            .photo-item {
              flex: 1 1 100%;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <h1>PhotoBooth Gallery</h1>
        <div class="gallery">
          ${photoElements}
        </div>
        <p><a href="./u">Upload</a></p>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('<h1>Failed to load photos</h1>');
  }
});

// Upload Page
app.get('/u', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upload Photo</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          flex-direction: column;
        }
        .upload-form {
          text-align: center;
        }
        .upload-form input, .upload-form button {
          margin: 5px;
        }
      </style>
    </head>
    <body>
      <h1>Upload a Photo</h1>
      <div class="upload-form">
        <form action="/upload" method="POST" enctype="multipart/form-data">
          <input type="text" name="authId" autocomplete="off" placeholder="Enter Authorization ID" required>
          <input type="file" name="photo" accept="image/*" required>
          <button type="submit">Upload Photo</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
