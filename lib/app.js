const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');
const request = require('superagent');
const { json } = require('express');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authRoutes = createAuthRoutes();

app.use('/auth', authRoutes);

app.use('/api', ensureAuth);

app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

async function getReviewText(id) {
  const reviewText = await request.get(`https://api.yelp.com/v3/businesses/${id}/reviews`)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`);
  return reviewText.body.reviews[0].text;
}

function sortByRating(a, b) {
  const ratingA = a.rating;
  const ratingB = b.rating;

  if(ratingA === ratingB) return 0;
  
  return ratingA > ratingB ? 1 : -1;
}

// I'll be honest, I lost myself in this refactor, so be super careful if you decide to incorporate this into your codebase.
async function getReview(lat, lon, keyword) {
  try {
  
    // let make an array of promises
    const promisesArray = [0, 50, 100, 150]
      .map(offset => request.get(
        `https://api.yelp.com/v3/businesses/search?latitude=${lat}&longitude=${lon}&term=${keyword}&limit=50&offset=${offset}`)
        .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`));

    // with Promise.all, all of the promises fire off at once instead of having to wait
    const responses = await Promise.all(promisesArray);

    // this, uh, shouuuld work, but i kind of went into a fugue refactoring state here without running the code.
    const slicedReviews = responses
      .flat()
      .map(business => ({
        ...business,
        city: business.location.city,          
        business_name: business.name,
        business_id: business.id,
        address: business.location.address1,
      }))
      .sort(sortByRating)
      .slice(0, 3);

    // let's make another array of promises and call them with Promise.all
    const reviewTextItems = await Promise.all(
      slicedReviews.map(review => getReviewText(review.business_id))
    );

    // now let's mush together the reviews with the fetched text
    return slicedReviews.map((review, i) => ({
      ...review,
      review: reviewTextItems[i]
    }));
  }

  catch(e) { console.error(e); }
}

app.get('/api/location', async(req, res) => {
  try {
    const userInput = req.query.search;
    const response = await request.get(`https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${userInput}&format=json`);
    res.json(response.body);
  } catch(e) {
    res.status(500), json({ error: e.message }); 
  }
});

app.get('/api/reviews', async(req, res) => {
  try {
    const userLat = req.query.latitude;
    const userLon = req.query.longitude;
    const keyword = req.query.keyword;
    const mungedData = await getReview(userLat, userLon, keyword);
  
    res.json(mungedData);
  }
  catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/detail-page', async(req, res) => {
  try {
    const userId = req.userId;
    const data = await client.query(`
    SELECT yelp_data.id, city, business_name, review, rating, image_url, trip_id, address, owner_id
     FROM yelp_data
     WHERE owner_id=$1 
     ORDER BY trip_id ASC
     `, [userId]);  
    res.json(data.rows);
  } catch(e) {
    res.status(418).json({ error: e.message });
  }
});

app.get('/api/detail-page/:id', async(req, res) => {
  const tripId = req.params.id;
  const userId = req.userId;
  const data = await client.query(`
  SELECT yelp_data.id, city, business_name, review, rating, image_url, address, trip_id, owner_id
  FROM yelp_data
  WHERE owner_id=$1 AND trip_id=$2 
   `, [userId, tripId]);

  res.json(data.rows);
});

app.post('/api/detail-page', async(req, res) =>  {
  try {
    const tripItem = {
      city: req.body.city,  
      business_name: req.body.business_name,
      review: req.body.review,
      rating: req.body.rating,
      image_url: req.body.image_url,
      trip_id: req.body.trip_id,
      address: req.body.address,
      owner_id: req.body.owner_id,
    };
    const data = await client.query(`
    INSERT INTO yelp_data(city, business_name, review, rating, image_url, trip_id, address, owner_id)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `, [tripItem.city, tripItem.business_name, tripItem.review, tripItem.rating, tripItem.image_url, tripItem.trip_id, tripItem.address, req.userId]);
    res.json(data.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/detail-page/:id', async(req, res) => {
  const tripId = req.params.id;
  const data = await client.query(`
  DELETE FROM yelp_data WHERE yelp_data.id=$1;`, [tripId]);
  
  res.json(data.rows[0]);
});

app.use(require('./middleware/error'));

module.exports = app;
