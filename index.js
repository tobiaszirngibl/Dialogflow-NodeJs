const express = require('express')
const bodyParser = require('body-parser')
const app = express()

var unirest = require('unirest')

var json2html = require('node-json2html');

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

    if(req.body.result.action !== null && req.body.result.action.indexOf("smalltalk") == -1) {

        switch (req.body.result.action) {

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


                   var webhookReply = 'Here is your plan: ';

                   unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/mealplans/generate?diet=" + diet + "&exclude=shellfish%2C+olives&targetCalories=" + calories + "&timeFrame=" + timespan)
                       .header("X-Mashape-Key", "KW1you8CYtmshogLM9mgGuL0OyYXp1t4glDjsnNJi6dLuPQUvo")
                       .header("Accept", "application/json")
                       .end(function (result) {
                        // Async??
                           var dN = result.body.meals;

                            var sourceList = [];
                           var obj = dN
                            var count = 0;
                            for (var item in dN) {
                                unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/"+dN[item].id+"/information?includeNutrition=")
                                    .header("X-Mashape-Key", "eB4slA65XimshJw9xMYuRG4XJ5qdp1vzOF2jsnzAGxOioS6ugP")
                                    .header("X-Mashape-Host", "spoonacular-recipe-food-nutrition-v1.p.mashape.com")
                                    .end(function (result) {
                                        sourceList.push([result.body.id, result.body.spoonacularSourceUrl]);

                                        if(sourceList.length == 3) {
                                            for(var i = 0; i<3; i++) {
                                                for(var j = 0; j<3; j++) {
                                                    if(obj[i].id == sourceList[j][0]) {
                                                        obj[i]["sourceUrl"] = sourceList[j][1];
                                                    }
                                                }

                                            }

                                            var jsonStr = JSON.stringify(obj);


        var tN = {"<>":"div","html":[
                {"<>":"ul","html":[
                        {"<>":"li","html":[
                                {"<>":"p","html":"Recipe ID: ${id} "},
                                {"<>":"p","html":"Title: ${title} "},
                                {"<>":"a","href":"${sourceUrl}","html":" ${sourceUrl} "},
                                {"<>":"br","html":""},
                                {"<>":"img","src":"https://spoonacular.com/recipeImages/${image}","alt":"${title}","width":"100px","height":"100px","html":""}
                            ]}
                    ]}
            ]}



         var html = json2html.transform(dN,tN);
         html = "<br><h2 style='text-align: center'> Daily Meal Plan</h2><br>" + html;
         var pdf = require('html-pdf');
         var fs = require('fs');
         var options = { format: 'Letter' };

         var fileName = "businesscard5.pdf";

         /*pdf.create(html, options).toFile('./'+fileName, function(err, resu) {
             if (err) return console.log(err);
             console.log(resu); // { filename: '/app/businesscard.pdf' }
             */
                                            pdf.create(html, options).toStream(function(err, stream){
             stream.pipe(fs.createWriteStream(fileName));
             console.log(stream);



             const keyFilename="./nutritionchatbot-firebase-adminsdk-34k9w-b9d42d7e4b.json"; //replace this with api key file
             const projectId = "nutritionchatbot" //replace with your project id
             const bucketName = "nutritionchatbot.appspot.com";

             const mime = require('mime-types');
             const gcs = require('@google-cloud/storage')({
                 projectId,
                 keyFilename
             });

             const bucket = gcs.bucket(bucketName);

             const filePath = fileName;
             console.log(filePath);
             const uploadTo = "subfolder/"+fileName;
             const fileMime = mime.lookup(filePath);

             bucket.upload(filePath, {
                 destination: uploadTo,
                 public: true,
                 metadata: { contentType: fileMime, cacheControl: "public, max-age=300" }
             }, function (err, file) {
                 if (err) {
                     console.log(err);
                     return;
                 }
                 webhookReply += createPublicFileURL(bucketName ,uploadTo);
                 res.status(200).json({
                     source: 'webhook',
                     speech: webhookReply,
                     displayText: webhookReply
                 })


             });




             function createPublicFileURL(bucketName, storageName) {
                 return "http://storage.googleapis.com/"+bucketName+"/"+storageName;

             }




        });
//Async?





                                        }
                                    });
                            };


                       });

                  break;

              default:
                  var userQuery = req.body.result.resolvedQuery;
                  userQuery = userQuery.replace(/ /g,"+");

                  unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/food/converse?contextId=342938&text="+userQuery)
                      .header("X-Mashape-Key", "eB4slA65XimshJw9xMYuRG4XJ5qdp1vzOF2jsnzAGxOioS6ugP")
                      .header("X-Mashape-Host", "spoonacular-recipe-food-nutrition-v1.p.mashape.com")
                      .end(function (result) {
                          res.status(200).json({
                              source: 'webhook',
                              speech: JSON.stringify(result.body),
                              displayText: JSON.stringify(result.body)
                          })

                      });
                  break;
          }
      }


})

app.listen(app.get('port'), function () {
    console.log('* Webhook service is listening on port:' + app.get('port'))
});

