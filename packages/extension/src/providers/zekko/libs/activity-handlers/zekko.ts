import { BaseNetwork } from '@/types/base-network';
import {
  Activity,
  ActivityStatus,
  ActivityType,
} from '@/types/activity';
import { ActivityHandlerType } from '@/libs/activity-state/types';
import ActivityState from '@/libs/activity-state';
import ZekkoAPI, { ZekkoTxDetail } from '../api';

/**
 * Convert a confirmed Zekko transaction into an Activity entry from the
 * perspective of `address`. We sum inflow (outputs paying us) and outflow
 * (inputs we signed) to determine direction and net value.
 */
function txToActivity(
  network: BaseNetwork,
  address: string,
  tx: ZekkoTxDetail,
  timestamp: number,
): Activity {
  let inflow = 0n;
  let outflow = 0n;
  let counterparty = '';
  for (const input of tx.inputs) {
    if (input.owner && input.owner === address) {
      outflow += BigInt(input.value_zek || '0');
    } else if (input.owner) {
      counterparty = counterparty || input.owner;
    }
  }
  for (const output of tx.outputs) {
    if (output.owner === address) {
      inflow += BigInt(output.value_zek || '0');
    } else {
      counterparty = counterparty || output.owner;
    }
  }
  const isIncoming = inflow > outflow;
  // For an outbound tx, value = sum of outputs that left our control
  // (i.e. everything not coming back as change). For an inbound tx, value
  // = inflow.
  const value = isIncoming ? inflow.toString() : (outflow - inflow).toString();
  const from = isIncoming ? counterparty : address;
  const to = isIncoming ? address : counterparty;
  return {
    network: network.name,
    from,
    to,
    value,
    timestamp,
    isIncoming,
    transactionHash: tx.txid,
    token: {
      name: network.name_long,
      symbol: network.currencyName,
      decimals: network.decimals,
      icon: network.icon,
    },
    status:
      tx.status === 'confirmed'
        ? ActivityStatus.success
        : ActivityStatus.pending,
    type: ActivityType.transaction,
  };
}

const ZekkoActivity: ActivityHandlerType = async (
  network: BaseNetwork,
  address: string,
): Promise<Activity[]> => {
  try {
    const api = (await network.api()) as unknown as ZekkoAPI;
    const [list, pending] = await Promise.all([
      api.getAddressTxs(address, 25, 0),
      api.getMempoolPending(),
    ]);
    const candidateIds = new Set<string>(list?.items?.map(row => row.txid) || []);
    const pendingDetails = await Promise.all(
      (pending?.items || []).map(async row => {
        const detail = await api.getTx(row.txid);
        if (!detail) return null;
        const involvesAddress =
          detail.inputs.some(input => input.owner === address) ||
          detail.outputs.some(output => output.owner === address);
        if (!involvesAddress) return null;
        candidateIds.add(row.txid);
        return { detail, timestamp: Date.now() };
      }),
    );
    if (!candidateIds.size) return [];
    // Fetch tx details in parallel so direction/value can be computed.
    const detailed = await Promise.all(
      Array.from(candidateIds).map(async txid => {
        const pendingMatch = pendingDetails.find(
          entry => entry && entry.detail.txid === txid,
        );
        if (pendingMatch) {
          return txToActivity(
            network,
            address,
            pendingMatch.detail,
            pendingMatch.timestamp,
          );
        }
        const row = list.items.find(item => item.txid === txid);
        if (!row) return null;
        const detail = await api.getTx(row.txid);
        if (!detail) return null;
        return txToActivity(network, address, detail, row.timestamp);
      }),
    );
    const activities = detailed.filter((a): a is Activity => a !== null);
    // Persist remote activities so locally-tracked entries (e.g. pending
    // sends) merge with the canonical chain history.
    const activityState = new ActivityState();
    await activityState.addActivities(activities, {
      address,
      network: network.name,
    });
    return activities;
  } catch (error) {
    console.error('Error fetching Zekko activities:', error);
    return [];
  }
};

export default ZekkoActivity;
