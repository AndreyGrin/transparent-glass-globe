interface Coordinates {
    latitude: number;
    longitude: number;
  }
  
  enum Direction {
    North = 'North',
    South = 'South',
    East = 'East',
    West = 'West',
  }
  
  export function calculateDirection(coord1: Coordinates, coord2: Coordinates): Direction {
    const lat1 = coord1.latitude;
    const lon1 = coord1.longitude;
    const lat2 = coord2.latitude;
    const lon2 = coord2.longitude;
  
    const latDiff = lat2 - lat1;
    const lonDiff = lon2 - lon1;
  
    if (latDiff === 0 && lonDiff === 0) {
      return Direction.North; // No movement, same coordinates
    }
  
    if (Math.abs(latDiff) > Math.abs(lonDiff)) {
      return latDiff > 0 ? Direction.North : Direction.South;
    } else {
      return lonDiff > 0 ? Direction.East : Direction.West;
    }
  }
  