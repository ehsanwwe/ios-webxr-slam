/**
 * Temporal smoothing layer with outlier rejection. Sits between SensorFusion
 * and the renderer to absorb jitter without introducing visible latency.
 * Phase 0 stub.
 */
export class PoseSmoother {
  constructor() {}

  push(_pose) {}

  current() {
    return null;
  }
}
