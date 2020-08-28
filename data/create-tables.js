const client = require('../lib/client');
const { getEmoji } = require('../lib/emoji.js');

run();

async function run() {

  try {
    await client.connect();

    await client.query(`
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(256) NOT NULL,
                    hash VARCHAR(512) NOT NULL
                );           
                CREATE TABLE yelp_data (
                    id SERIAL PRIMARY KEY NOT NULL,
                    city TEXT NOT NULL,
                    business_name TEXT NOT NULL,
                    review TEXT NOT NULL,
                    rating VARCHAR(512) NOT NULL,
                    image_url TEXT NOT NULL,
                    address TEXT,
                    trip_id INTEGER NOT NULL,
                    owner_id INTEGER NOT NULL REFERENCES users(id)
                    );
                `);
    console.log('create tables complete', getEmoji(), getEmoji(), getEmoji());
  }
  catch(err) {
    console.log(err);
  }
  finally {
    client.end();
  }

}
