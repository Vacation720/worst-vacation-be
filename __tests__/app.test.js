require('dotenv').config();
const { execSync } = require('child_process');
const fakeRequest = require('supertest');
const app = require('../lib/app');
const client = require('../lib/client');

describe('routes', () => {
  let token;

  const newTrip = {
    id: 4,
    city: 'Portland',  
    business_name: 'Thai Restaurant',
    review: 'It\'s bad',
    rating: 1,
    image_url: 'cat.jpeg',
    trip_id: 1,
    address: '123 Fake St.',
    owner_id: 2,
  };

  beforeAll(async done => {
    execSync('npm run setup-db');
    client.connect();
    const signInData = await fakeRequest(app)
      .post('/auth/signup')
      .send({
        email: 'jon@user.com',
        password: '1234'
      });
    token = signInData.body.token;
    return done();
  });

  afterAll(done => {
    return client.end(done);
  });

  test('returns a new trip when creating new trip', async(done) => {
    const data = await fakeRequest(app)
      .post('/api/detail-page')
      .send(newTrip)
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);
    expect(data.body).toEqual(newTrip);
    done();
  });

  test('returns all todos for the user when hitting GET / detail-page', async(done) => {
    const expected = [
      {
        id: 4,
        city: 'Portland',  
        business_name: 'Thai Restaurant',
        review: 'It\'s bad',
        rating: 1,
        image_url: 'cat.jpeg',
        trip_id: 1,
        address: '123 Fake St.',
        owner_id: 2,
      }
    ];
    const data = await fakeRequest(app)
      .get('/api/detail-page')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);
    expect(data.body).toEqual(expected);
    done();
  });
  
  test('returns a single trip from trip id for the user when hitting GET /detail-page/:id', async(done) => {
    const expected = [{
      id: 4,
      city: 'Portland',  
      business_name: 'Thai Restaurant',
      review: 'It\'s bad',
      rating: 1,
      image_url: 'cat.jpeg',
      trip_id: 1,
      address: '123 Fake St.',
      owner_id: 2,
    }];
    const data = await fakeRequest(app)
      .get('/api/detail-page/1')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);
    expect(data.body).toEqual(expected);
    done();
  });

  // TODO
//   test('delete a single trip for the user when hitting DELETE /detail-page/:id', async(done) => {
//     await fakeRequest(app)
//       .delete('/api/detail-page/1')
//       .set('Authorization', token)
//       .expect('Content-Type', /json/)
//       .expect(200);
//     const data = await fakeRequest(app)
//       .get('/api/detail-page/')
//       .set('Authorization', token)
//       .expect('Content-Type', /json/)
//       .expect(200);
//     expect(data.body).toEqual([]);
//     done();
//   });

test('returns an error when trying to get without an authorization key', async(done) => {

  const expectation = 
    { 'error': 'no authorization found' };

  const data = await fakeRequest(app)
    .get('/api/detail-page')
    .expect('Content-Type', /json/)
    .expect(401);

  expect(data.body).toEqual(expectation);
  done();
});

test('returns an error when trying to post without an authorization key', async(done) => {

  const expectation = 
    { 'error': 'no authorization found' };

  const data = await fakeRequest(app)
    .post('/api/detail-page')
    .send(newTrip)
    .expect('Content-Type', /json/)
    .expect(401);

  expect(data.body).toEqual(expectation);
  done();
});

});

