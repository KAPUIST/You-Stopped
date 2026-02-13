/* eslint-disable @typescript-eslint/no-namespace */

declare global {
  interface Window {
    kakao: typeof kakao;
  }
}

declare namespace kakao.maps {
  function load(callback: () => void): void;

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setBounds(bounds: LatLngBounds, padding?: number): void;
    addControl(control: ZoomControl, position: ControlPosition): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  class Polyline {
    constructor(options: PolylineOptions);
    setMap(map: Map | null): void;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
  }

  class ZoomControl {}

  interface MapOptions {
    center: LatLng;
    level?: number;
    scrollwheel?: boolean;
    disableDoubleClickZoom?: boolean;
  }

  interface PolylineOptions {
    map?: Map;
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
  }

  interface CustomOverlayOptions {
    map?: Map;
    position: LatLng;
    content: string;
    yAnchor?: number;
    xAnchor?: number;
    zIndex?: number;
  }

  enum ControlPosition {
    TOPRIGHT = 3,
    RIGHT = 7,
    BOTTOMRIGHT = 9,
  }
}

export {};
