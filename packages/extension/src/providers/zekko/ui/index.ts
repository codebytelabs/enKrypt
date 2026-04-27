import { ProviderName, UIExportOptions } from '@/types/provider';
import getRoutes from './routes';

const uiExport: UIExportOptions = {
  providerName: ProviderName.zekko,
  routes: getRoutes(ProviderName.zekko),
};

export default uiExport;
