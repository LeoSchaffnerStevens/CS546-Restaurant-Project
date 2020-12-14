const userRoutes = require('./users');
const restaurantRoutes = require('./restaurants');
const serachRoutes = require('./search');
// const privateRoutes = require('./private');
// const loginRoutes = require('./login');

const constructorMethod = (app) => {
  app.use('/users', userRoutes);
  app.use('/restaurants', restaurantRoutes);
  app.use('/search', serachRoutes);
  // app.use('/private', privateRoutes);
  // app.use('/login', loginRoutes);

  app.get('/', (req, res) => {
    res.render('home');
  })
  
  app.get('/signup', (req, res) => {
    res.render('signup');
  });

  app.use('*', (req, res) => {
    res.sendStatus(404);
  });
};

module.exports = constructorMethod;