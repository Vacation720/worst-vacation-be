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

async function getLatLong(cityName) {
  try {
    const response = await request.get(`https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${cityName}&format=json`);
    const city = response.body[0];
    return {
      formatted_query: city.display_name,
      latitude: city.lat,
      longitude: city.lon,

    }; 
  } catch(e) {

    cityName.status(418).json({ error: e.message });
  }
}

// async function getReviewText(id) {
//   for (let i = 1; i < 300; i++) {
//   const reviewText = await request.get(`https://api.yelp.com/v3/businesses/${id}/reviews`)
//     .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`);
//   return reviewText.body.reviews[i].text;
//   }
// }

function sortByRating(a, b) {
  const ratingA = a.rating;
  const ratingB = b.rating;

  let comparison = 0;
  if (ratingA > ratingB) {
    comparison = 1;
  } else if (ratingA < ratingB) {
    comparison = -1;
  }
  return comparison;
};

var Bottleneck = require('bottleneck/es5');
const limiter = new Bottleneck({  minTime: 333 });
//if we want to fix performance, can edit minTime

// const wrapped = limiter.wrap(getReviewText);

async function getReview(lat, lon, keyword) {
  try {
    // declare array for results to be pushed into
    let totalResults = [];

    // for loop runs 6 times, each time pushing 50 results into totalResults
    for (let i = 1; i < 6; i++) {
      let offset = i * 50;

      // each offset results
      const response = await request.get(`https://api.yelp.com/v3/businesses/search?latitude=${lat}&longitude=${lon}&term=worst%${keyword}&limit=50&offset=${offset}`)
        .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`);

      let reviewData = response.body.businesses;
      totalResults.push(...reviewData);

    }
      const reviews = totalResults.map(review => {
        // const fetchedReview = await wrapped(review.id);   
        return {
          city: review.city,          
          business_type: review.categories.title,
          business_name: review.name,
          // review: fetchedReview,
          rating: review.rating,
          image_url: review.image_url
        };
      });
      reviews.sort(sortByRating)
      return reviews;
    }
    catch(e) { console.error(e); }
}

app.get('/location', async(req, res) => {
  try {
    const userInput = req.query.search;
    const response = await request.get(`https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${userInput}&format=json`);
    res.json(response.body);
  } catch(e) {
    res.status(500), json({ error: e.message }); 
  }
});

app.get('/reviews', async(req, res) => {
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

app.use(require('./middleware/error'));

module.exports = app;
