export interface DronePosition {
  id: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export interface DroneMessage {
  type: 'position' | 'welcome' | 'status';
  data: DronePosition;
  timestamp: number;
}
