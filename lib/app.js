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

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
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

  let comparison = 0;
  if(ratingA > ratingB) {
    comparison = 1;
  } else if(ratingA < ratingB) {
    comparison = -1;
  }
  return comparison;
}


async function getReview(lat, lon, keyword) {
  try {
    // declare array for results to be pushed into
    let totalResults = [];

    // for loop runs 6 times, each time pushing 50 results into totalResults
    for(let i = 1; i < 4; i++) {
      let offset = i * 50;

      // each offset results
      const response = await request.get(`https://api.yelp.com/v3/businesses/search?latitude=${lat}&longitude=${lon}&term=${keyword}&limit=50&offset=${offset}`)
        .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`);

      let reviewData = response.body.businesses;
      totalResults.push(...reviewData);

    }
    const reviews = totalResults.map(review => {
      // const fetchedReview = await wrapped(review.id);   
      return {
        city: review.location.city,          
        business_name: review.name,
        business_id: review.id,
        address: review.location.address1,
        rating: review.rating,
        image_url: review.image_url
      };
    });
    reviews.sort(sortByRating);
    const slicedReviews = reviews.slice(0, 3);
    for(let i = 0; i < slicedReviews.length; i++) {
      slicedReviews[i].review = await getReviewText(slicedReviews[i].business_id);
    }
    return slicedReviews;
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

//get list of chosen 'items'
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


//POST
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

//DELETE
app.delete('/api/detail-page/:id', async(req, res) => {
  const tripId = req.params.id;
  const data = await client.query(`
  DELETE FROM yelp_data WHERE yelp_data.id=$1;`, [tripId]);
  
  res.json(data.rows[0]);
});


app.use(require('./middleware/error'));

module.exports = app;
