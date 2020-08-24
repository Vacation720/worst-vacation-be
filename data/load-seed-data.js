const client = require('../lib/client');
// import our seed data:
const yelpData = require('./yelp.js');
const usersData = require('./users.js');
const { getEmoji } = require('../lib/emoji.js');

run();

async function run() {

  try {
    await client.connect();

    const users = await Promise.all(
      usersData.map(user => {
        return client.query(`
                      INSERT INTO users (email, hash)
                      VALUES ($1, $2)
                      RETURNING *;
                  `,
        [user.email, user.hash]);
      })
    );
      
    const user = users[0].rows[0];

    await Promise.all(
      yelpData.map(business => {
        return client.query(`
                    INSERT INTO yelp_data (category, business_type, business_name, review, rating, image_url, city, owner_id )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
                `,
        [business.category, business.business_type, business.business_name, business.review,  business.rating, business.image_url, business.city,  user.id]);
      })
    );
    

    console.log('seed data load complete', getEmoji(), getEmoji(), getEmoji());
  }
  catch(err) {
    console.log(err);
  }
  finally {
    client.end();
  }
    
}
