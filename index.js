const express = require('express')
const bodyParser = require('body-parser')
const app = express()

var unirest = require('unirest')

app.use(bodyParser.json())
app.set('port', (process.env.PORT || 5000))

const REQUIRE_AUTH = true
const AUTH_TOKEN = 'an-example-token'

app.get('/', function (req, res) {
  res.send('Use the /webhook endpoint.')
})
app.get('/webhook', function (req, res) {
  res.send('You must POST your request')
})

app.post('/webhook', function (req, res) {
  // we expect to receive JSON data from api.ai here.
  // the payload is stored on req.body

  // we have a simple authentication
  if (REQUIRE_AUTH) {
    if (req.headers['auth-token'] !== AUTH_TOKEN) {
      return res.status(401).send('Unauthorized')
    }
  }

  // and some validation too
  if (!req.body || !req.body.result || !req.body.result.parameters) {
    return res.status(400).send('Bad Request')
  }

  // the value of Action from api.ai is stored in req.body.result.action
  console.log('* Received action -- %s', req.body.result.action)


      switch(req.body.result.action) {


          case "food.substitute":
              var action = req.body.result.parameters['food-substitute'];
              var webhookReply = 'Hello! Here is a substitute list for ' + action + ': ';

              unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/food/ingredients/substitutes?ingredientName=" + action)
                  .header("X-Mashape-Key", "eB4slA65XimshJw9xMYuRG4XJ5qdp1vzOF2jsnzAGxOioS6ugP")
                  .header("X-Mashape-Host", "spoonacular-recipe-food-nutrition-v1.p.mashape.com")
                  .end(function (result) {
                      for (var i in result.body.substitutes) {
                          val = result.body.substitutes[i];
                          webhookReply += val + " or ";
                      }
                      res.status(200).json({
                          source: 'webhook',
                          speech: webhookReply,
                          displayText: webhookReply
                      })

                  });
              break;

          case "food.plan":

              var diet = req.body.result.parameters['diet'];
              var calories = req.body.result.parameters['calories'];
              var timespan = req.body.result.parameters['timespan'];

              console.log(diet);
              console.log(calories);
              console.log(timespan);
              var webhookReply = 'Hello!: ';

              unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/mealplans/generate?diet="+diet+"&exclude=shellfish%2C+olives&targetCalories="+calories+"&timeFrame="+timespan)
                  .header("X-Mashape-Key", "KW1you8CYtmshogLM9mgGuL0OyYXp1t4glDjsnNJi6dLuPQUvo")
                  .header("Accept", "application/json")
                  .end(function (result) {
                          webhookReply += result.toString();

                      res.status(200).json({
                          source: 'webhook',
                          speech: webhookReply,
                          displayText: webhookReply
                      })

                  });

              break;

          default:
              var i = "";
              break;
      }



})

app.listen(app.get('port'), function () {
  console.log('* Webhook service is listening on port:' + app.get('port'))
})
