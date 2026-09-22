import { ForecastHorizon, ModelAssetEntry } from '../types';

export const MODEL_ASSETS: ModelAssetEntry[] = [
  {
    horizon: 6 as ForecastHorizon,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    assetRequire: require('../../assets/models/model_h6m.pte') as number,
    filename: 'model_h6m.pte',
  },
  {
    horizon: 12 as ForecastHorizon,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    assetRequire: require('../../assets/models/model_h12m.pte') as number,
    filename: 'model_h12m.pte',
  },
  {
    horizon: 18 as ForecastHorizon,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    assetRequire: require('../../assets/models/model_h18m.pte') as number,
    filename: 'model_h18m.pte',
  },
  {
    horizon: 24 as ForecastHorizon,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    assetRequire: require('../../assets/models/model_h24m.pte') as number,
    filename: 'model_h24m.pte',
  },
  {
    horizon: 30 as ForecastHorizon,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    assetRequire: require('../../assets/models/model_h30m.pte') as number,
    filename: 'model_h30m.pte',
  },
  {
    horizon: 36 as ForecastHorizon,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    assetRequire: require('../../assets/models/model_h36m.pte') as number,
    filename: 'model_h36m.pte',
  },
  {
    horizon: 42 as ForecastHorizon,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    assetRequire: require('../../assets/models/model_h42m.pte') as number,
    filename: 'model_h42m.pte',
  },
  {
    horizon: 48 as ForecastHorizon,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    assetRequire: require('../../assets/models/model_h48m.pte') as number,
    filename: 'model_h48m.pte',
  },
];

export const MODEL_DEST_DIR = 'models';
