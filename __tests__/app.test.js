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
    category: 'Thai',
    business_type: 'Restaurant',
    business_name: 'Thai Restaurant',
    review: 'It\s bad',
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

  test('returns all todos for the user when hitting GET /todos', async(done) => {
    const expected = [
      {
        id: 4,
        city: 'Portland',  
        category: 'Thai',
        business_type: 'Restaurant',
        business_name: 'Thai Restaurant',
        review: 'It\s bad',
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
  
  // test('returns a single todo for the user when hitting GET /todos/:id', async(done) => {
  //   const expected = [{
  //     id: 3,
  //     todo: 'eat lunch',
  //     completed: false,
  //     owner_id: 2,
  //   }];
  //   const data = await fakeRequest(app)
  //     .get('/api/todos/3')
  //     .set('Authorization', token)
  //     .expect('Content-Type', /json/)
  //     .expect(200);
  //   expect(data.body).toEqual(expected);
  //   done();
  // });
  // test('updates a single todo for the user when hitting PUT /todos/:id', async(done) => {
  //   const newTodo = 
  //     {
  //       id: 3,
  //       todo: 'eat lunch',
  //       completed: true,
  //       owner_id: 2,
  //     }
  //   ;
  //   const expectedAllTodos = [{
  //     id: 3,
  //     todo: 'eat lunch',
  //     completed: true,
  //     owner_id: 2,
  //   }];

  //   const data = await fakeRequest(app)
  //     .put('/api/todos/3')
  //     .send(newTodo)
  //     .set('Authorization', token)
  //     .expect('Content-Type', /json/)
  //     .expect(200);
  //   const allTodos = await fakeRequest(app)
  //     .get('/api/todos')
  //     .send(newTodo)
  //     .set('Authorization', token)
  //     .expect('Content-Type', /json/)
  //     .expect(200);
  //   expect(data.body).toEqual(newTodo);
  //   expect(allTodos.body).toEqual(expectedAllTodos);
  //   done();
  // });

  // test('delete a single todo for the user when hitting DELETE /todos/:id', async(done) => {
  //   await fakeRequest(app)
  //     .delete('/api/todos/4')
  //     .set('Authorization', token)
  //     .expect('Content-Type', /json/)
  //     .expect(200);
  //   const data = await fakeRequest(app)
  //     .get('/api/todos/')
  //     .set('Authorization', token)
  //     .expect('Content-Type', /json/)
  //     .expect(200);
  //   expect(data.body).toEqual([]);
  //   done();
  // });
});