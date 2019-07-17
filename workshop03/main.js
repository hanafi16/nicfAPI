const { join } = require('path');
const fs = require('fs');

const cors = require('cors');
const range = require('express-range')
const compression = require('compression')

const { Validator, ValidationError } = require('express-json-validator-middleware')
const  OpenAPIValidator  = require('express-openapi-validator').OpenApiValidator;

const schemaValidator = new Validator({ allErrors: true, verbose: true });

const express = require('express')

const CitiesDB = require('./citiesdb');

//Load application keys
//Rename _keys.json file to keys.json
const keys = require('./keys.json')

console.info(`Using ${keys.mongo}`);

// TODO change your databaseName and collectioName 
// if they are not the defaults below
const db = CitiesDB({  
	connectionUrl: keys.mongo, 
	databaseName: 'cities', 
	collectionName: 'cities'
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TODO 1/2 Load schemans
const citySchema = require('./schema/city-schema.json');

new OpenAPIValidator({apiSpecPath: join(__dirname, 'schema', 'city-api.yaml')}).install(app)


// Start of workshop
// TODO 2/2 Copy your routes from workshop02 here
// Start of workshop

// Mandatory workshop
// TODO GET /api/states
app.get('/api/states', (req, resp) => {

	resp.type('application/json');

	db.findAllStates()
	.then(result => {
		resp.status(200);
		resp.set('X-Date', (new Date()).toUTCString());
		resp.json(result);
	})
	.catch(error => {
		resp.status(400);
		resp.json(error);
	})
	
});

// TODO GET /api/state/:state
app.get('/api/state/:state', (req, resp) => {
	const stateAbbrev = req.params.state;

	resp.type('application/json');

	db.findAllStates()
	.then(result => {
		if (result.indexOf(stateAbbrev.toUpperCase()) < 0)
		{
			resp.status(400);
			resp.json({error: `Not a valid state: ${stateAbbrev}`})
			return;
		}
		return (db.findCitiesByState(stateAbbrev))
	})
	.then(result => {
		resp.status(200);
		resp.set('X-Date', (new Date()).toUTCString());
		resp.json(result.map(v => `/api/city/${v}`));
	})
	.catch(error => {
		resp.status(400);
		resp.json({error:error});
	})

});



// TODO GET /api/city/:cityId
app.get('/api/city/:cityId', (req, resp) => {
	const cityId = req.params.cityId;
	resp.type('application/json');

	db.findCityById(cityId)
	.then(result => {
		if (result.length == 0) {
			resp.status(404);
			resp.json({error: `Not a valid City ID: ${cityId}`})
			return;
		}
		resp.status(200);
		resp.set('X-Date', (new Date()).toUTCString());
		resp.json(result);
	})
	.catch(error => {
		resp.status(400);
		resp.json({error:error});
	})

});


// TODO POST /api/city
app.post('/api/city', 
	schemaValidator.validate({body: citySchema}),
    (req, resp) => {
        const newCity = req.body;
        resp.type('application/json')
        db.insertCity(newCity)
            .then(result => {
                resp.status(201)
                resp.json(result);
            })
            .catch(error => {
                resp.status(400);
                resp.json({ error: error});
            })
    }
)
// Optional workshop
// TODO HEAD /api/state/:state



// TODO GET /state/:state/count



// TODO GET /city/:name



// End of workshop

// End of workshop

app.use('/schema', express.static(join(__dirname, 'schema')));

app.use((error, req, resp, next) => {
	if (error instanceof ValidationError)
		return resp.status(400).type('application/json').json({ error: error });
	else if (error.status)
		return resp.status(400).type('application/json').json({ error: error });
	next();
});

db.getDB()
	.then((db) => {
		const PORT = parseInt(process.argv[2] || process.env.APP_PORT) || 3000;

		console.info('Connected to MongoDB. Starting application');
		app.listen(PORT, () => {
			console.info(`Application started on port ${PORT} at ${new Date()}`);
		});
	})
	.catch(error => {
		console.error('Cannot connect to mongo: ', error);
		process.exit(1);
	});
