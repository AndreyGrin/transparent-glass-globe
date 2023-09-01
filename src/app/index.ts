import * as express from 'express';
import * as morgan from 'morgan';

import { notNil, flatten } from '../util';
import { Airport, Route, loadAirportData, loadRouteData } from '../data';

export async function createApp() {
  const app = express();

  const airports = await loadAirportData();
  const airportsByCode = new Map<string, Airport>(
    flatten(airports.map((airport) => [
      airport.iata !== null ? [airport.iata.toLowerCase(), airport] as const : null,
      airport.icao !== null ? [airport.icao.toLowerCase(), airport] as const : null,
    ].filter(notNil)))
  );

  app.use(morgan('tiny'));

  app.get('/health', (_, res) => res.send('OK'));
  app.get('/airports/:code', (req, res) => {
    const code = req.params['code'];
    if (code === undefined) {
      return res.status(400).send('Must provide airport code');
    }

    const airport = airportsByCode.get(code.toLowerCase());
    if (airport === undefined) {
      return res.status(404).send('No such airport, please provide a valid IATA/ICAO code');
    }

    return res.status(200).send(airport);
  });

  app.get('/routes/:source/:destination', async (req, res) => {
    const source = req.params['source'];
    const destination = req.params['destination'];
    if (source === undefined || destination === undefined) {
      return res.status(400).send('Must provide source and destination airports');
    }

    const sourceAirport = airportsByCode.get(source.toLowerCase());
    const destinationAirport = airportsByCode.get(destination.toLowerCase());
    if (sourceAirport === undefined || destinationAirport === undefined) {
      return res.status(404).send('No such airport, please provide a valid IATA/ICAO codes');
    }

    // TODO: Figure out the route from source to destination
    const routes = await loadRouteData(); // Load route data

    // Calculate the shortest route using Dijkstra's algorithm
    const shortestRoute = calculateShortestRoute(sourceAirport, destinationAirport, routes);

    if (shortestRoute === null) {
      return res.status(404).send('No route found between the airports');
    }

    let distance = 0;
    let hops = [sourceAirport.iata]
    shortestRoute.map( route => {
      distance += route.distance;
      hops.push(route.destination.iata)
    })

    return res.status(200).send({
      source,
      destination,
      distance: distance,
      hops: hops,
    });
  });

  return app;
}

function calculateShortestRoute(
  source: Airport,
  destination: Airport,
  routes: Route[]
): Route[] | null {
  const queue: { airport: Airport; distance: number }[] = [];
  const visited: Set<string> = new Set();
  const distances: Map<string, number> = new Map();
  const previous: Map<string, Route> = new Map();

  queue.push({ airport: source, distance: 0 });
  distances.set(source.id, 0);

  while (queue.length > 0) {
    queue.sort((a, b) => a.distance - b.distance);
    const { airport, distance } = queue.shift()!;

    if (visited.has(airport.id)) continue;
    visited.add(airport.id);
    
    if (airport.id === destination.id) {
      const path: Route[] = [];
      let curr = destination;
      while (previous.has(curr.id)) {
        const prevRoute = previous.get(curr.id);
        if (prevRoute) {
          path.unshift(prevRoute);
          curr = prevRoute.source;
        }
      }
      return path;
    }

    const nextRoutes = routes.filter(
      (route) => route.source.id === airport.id && !visited.has(route.destination.id)
    );

    for (const nextRoute of nextRoutes) {
      const nextAirport = nextRoute.destination;
      const nextDistance = distance + nextRoute.distance;

      if (!distances.has(nextAirport.id) || nextDistance < distances.get(nextAirport.id)!) {
        distances.set(nextAirport.id, nextDistance);
        previous.set(nextAirport.id, nextRoute);
        queue.push({ airport: nextAirport, distance: nextDistance });
      }
    }
  }

  return null; // No route found
}