import { Button, Col, Divider, Popover, Row } from 'antd';
import React, { useState } from 'react';
import styled from 'styled-components';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  useBalances,
  useMarket,
  useSelectedBaseCurrencyAccount,
  useSelectedOpenOrdersAccount,
  useSelectedQuoteCurrencyAccount,
  useTokenAccounts,
} from '../srm-utils/markets';
import { useWallet } from '../components/wallet/wallet';
import { settleFunds } from '../srm-utils/send';
import { useSendConnection } from '../srm-utils/connection';
import { notify } from '../srm-utils/notifications';
import { Balances } from '../srm-utils/types';
import { useInterval } from '../srm-utils/useInterval';
import { useLocalStorageState } from '../srm-utils/utils';
import { AUTO_SETTLE_DISABLED_OVERRIDE } from '../srm-utils/preferences';
import { useReferrer } from '../srm-utils/referrer';
import LinkAddress from './LinkAddress';
import StandaloneTokenAccountsSelect from './StandaloneTokenAccountSelect';
import Link from './Link';
import DepositDialog from './DepositDialog';
import FloatingElement from './layout/FloatingElement';

const RowBox = styled(Row)`
  padding-bottom: 20px;
`;

const Tip = styled.p`
  font-size: 12px;
  padding-top: 6px;
`;

const ActionButton = styled(Button)`
  color: #0156ff;
  background-color: #212734;
  border-width: 0px;
`;

export default function StandaloneBalancesDisplay() {
  const { baseCurrency, quoteCurrency, market } = useMarket();
  const balances = useBalances();
  const openOrdersAccount = useSelectedOpenOrdersAccount(true);
  const connection = useSendConnection();
  const { providerUrl, providerName, wallet, connected } = useWallet();
  const [baseOrQuote, setBaseOrQuote] = useState('');
  const baseCurrencyAccount = useSelectedBaseCurrencyAccount();
  const quoteCurrencyAccount = useSelectedQuoteCurrencyAccount();
  const [tokenAccounts] = useTokenAccounts();
  const baseCurrencyBalances = balances && balances.find(b => b.coin === baseCurrency);
  const quoteCurrencyBalances = balances && balances.find(b => b.coin === quoteCurrency);
  const [autoSettleEnabled] = useLocalStorageState('autoSettleEnabled', true);
  const [lastSettledAt, setLastSettledAt] = useState<number>(0);
  const { usdcRef, usdtRef } = useReferrer();
  async function onSettleFunds() {
    if (!wallet) {
      notify({
        message: 'Wallet not connected',
        description: 'wallet is undefined',
        type: 'error',
      });

      return;
    }

    if (!market) {
      notify({
        message: 'Error settling funds',
        description: 'market is undefined',
        type: 'error',
      });

      return;
    }
    if (!openOrdersAccount) {
      notify({
        message: 'Error settling funds',
        description: 'Open orders account is undefined',
        type: 'error',
      });

      return;
    }
    if (!baseCurrencyAccount) {
      notify({
        message: 'Error settling funds',
        description: 'Open orders account is undefined',
        type: 'error',
      });

      return;
    }
    if (!quoteCurrencyAccount) {
      notify({
        message: 'Error settling funds',
        description: 'Open orders account is undefined',
        type: 'error',
      });

      return;
    }

    try {
      await settleFunds({
        market,
        openOrders: openOrdersAccount,
        connection,
        wallet,
        baseCurrencyAccount,
        quoteCurrencyAccount,
        usdcRef,
        usdtRef,
      });
    } catch (e) {
      notify({
        message: 'Error settling funds',
        description: e.message,
        type: 'error',
      });
    }
  }

  useInterval(() => {
    const autoSettle = async () => {
      if (
        AUTO_SETTLE_DISABLED_OVERRIDE ||
        !wallet ||
        !market ||
        !openOrdersAccount ||
        !baseCurrencyAccount ||
        !quoteCurrencyAccount ||
        !autoSettleEnabled
      ) {
        return;
      }
      if (!baseCurrencyBalances?.unsettled && !quoteCurrencyBalances?.unsettled) {
        return;
      }
      if (Date.now() - lastSettledAt < 15000) {
        return;
      }
      try {
        console.log('Settling funds...');
        setLastSettledAt(Date.now());
        await settleFunds({
          market,
          openOrders: openOrdersAccount,
          connection,
          wallet,
          baseCurrencyAccount,
          quoteCurrencyAccount,
          usdcRef,
          usdtRef,
        });
      } catch (e) {
        console.log('Error auto settling funds: ' + e.message);

        return;
      }
      console.log('Finished settling funds.');
    };
    connected && wallet?.autoApprove && autoSettleEnabled && autoSettle();
  }, 1000);

  const formattedBalances: [
    string | undefined,
    Balances | undefined,
    string,
    string | undefined,
  ][] = [
    [baseCurrency, baseCurrencyBalances, 'base', market?.baseMintAddress.toBase58()],
    [quoteCurrency, quoteCurrencyBalances, 'quote', market?.quoteMintAddress.toBase58()],
  ];

  return (
    <FloatingElement style={{ flex: 1, paddingTop: 10 }}>
      {formattedBalances.map(([currency, balances, baseOrQuote, mint], index) => (
        <React.Fragment key={index}>
          <Divider style={{ borderColor: 'white' }}>
            {currency}{' '}
            {mint && (
              <Popover
                content={<LinkAddress address={mint} />}
                placement="bottomRight"
                title="Token mint"
                trigger="hover"
              >
                <InfoCircleOutlined style={{ color: '#0156ff' }} />
              </Popover>
            )}
          </Divider>
          {connected && (
            <RowBox align="middle" style={{ paddingBottom: 10 }}>
              <StandaloneTokenAccountsSelect
                accounts={tokenAccounts?.filter(
                  account => account.effectiveMint.toBase58() === mint,
                )}
                mint={mint}
                label
              />
            </RowBox>
          )}
          <RowBox align="middle" justify="space-between" style={{ paddingBottom: 12 }}>
            <Col>Wallet balance:</Col>
            <Col>{balances && balances.wallet}</Col>
          </RowBox>
          <RowBox align="middle" justify="space-between" style={{ paddingBottom: 12 }}>
            <Col>Unsettled balance:</Col>
            <Col>{balances && balances.unsettled}</Col>
          </RowBox>
          <RowBox align="middle" justify="space-around">
            <Col style={{ width: 150 }}>
              <ActionButton block size="large" onClick={() => setBaseOrQuote(baseOrQuote)}>
                Deposit
              </ActionButton>
            </Col>
            <Col style={{ width: 150 }}>
              <ActionButton block size="large" onClick={onSettleFunds}>
                Settle
              </ActionButton>
            </Col>
          </RowBox>
          <Tip>
            All deposits go to your{' '}
            <Link external to={providerUrl}>
              {providerName}
            </Link>{' '}
            wallet
          </Tip>
        </React.Fragment>
      ))}
      <DepositDialog baseOrQuote={baseOrQuote} onClose={() => setBaseOrQuote('')} />
    </FloatingElement>
  );
}
