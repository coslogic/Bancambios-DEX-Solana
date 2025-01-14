import React, { useEffect, useState } from 'react';
import { TinyArea } from '@ant-design/plots';
import { makeStyles } from '@mui/styles';
import { useTokenMap } from '@serum/swap-ui';
import { Box, Typography } from '@mui/material';
import { TokenName } from './SwapCard';
import { TokenIcon } from './TokenIcon';
import { PublicKey } from '@solana/web3.js';
import { getQuotesHistorical } from '../../../services/api';
import moment from 'moment';
import { SwapType } from '../../../types';
import { AxiosResponse } from 'axios';

interface ChartProps {
  mint: PublicKey;
  swapType: SwapType;
}

const useStyles = makeStyles(theme => ({
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'left',
    alignItems: 'center',
    width: '100%',
    height: '85px',
    maxWidth: '435px',
    borderRadius: theme.spacing(2.5),
    boxShadow: '0px 0px 30px 5px rgba(0,0,0,0.075)',
    boxSizing: 'border-box',
    backgroundColor: '#35363A !important',
    padding: '10px 16px',
  },
  tokenWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'left',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  tokenInfoWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: theme.spacing(1),
  },
  tokenNameAndDiffWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  price: {
    fontFamily: 'Saira',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '16px',
    lineHeight: '29px',
    textAlign: 'left',
    color: '#FFFFFF',
  },
  lastPriceChange: {
    fontFamily: 'Saira',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: '12px',
    lineHeight: '19px',
    textAlign: 'left',
    color: '#FFFFFF',
  },
  chartWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing(2),
  },
  triangleTop: {
    width: theme.spacing(2),
    height: '100%',
    color: 'rgba(111, 230, 92, 1)',
    textAlign: 'center',
    marginRight: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
  },
  triangleBottom: {
    width: theme.spacing(2),
    height: '100%',
    color: 'red',
    textAlign: 'center',
    marginRight: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
  },
}));

export const ChartContainer: React.FC<ChartProps> = ({ mint, swapType }) => {
  const styles = useStyles();
  const tokenMap = useTokenMap();
  const requestDelay = swapType === SwapType.from ? 0 : 2000;
  const tokenInfo = tokenMap.get(mint.toString());
  const [historicalQuotes, setHistoricalQuotes] = useState<number[]>([]);
  const [percentageChange, setPercentageChange] = useState<number | undefined>(undefined);

  const getTokenHistoricalQuotes = async (): Promise<AxiosResponse<any>> => {
    const endTime = moment().toISOString();
    const startTime = moment().subtract(1, 'months').toISOString();

    return await getQuotesHistorical(tokenInfo?.symbol!, startTime, endTime);
  };

  const getPercentageChange = (previousPrice: number, newPrice: number): number => {
    const decreaseValue = previousPrice - newPrice;

    return Number(Number((decreaseValue / previousPrice) * 100).toFixed(1));
  };

  useEffect(() => {
    /*
     * setTimeout is required while using the free cryptocurrency market data API -
     * 1 request per second limit
     */
    const apiRequestTimer = setTimeout(() => {
      getTokenHistoricalQuotes().then(response => {
        const reducedQuotesArray = response.data.reduce((history, exchange) => {
          history.push(+Number(exchange.rate).toFixed(5));
          return history;
        }, []);
        setHistoricalQuotes(reducedQuotesArray);
        if (reducedQuotesArray.length > 0) {
          setPercentageChange(
            getPercentageChange(
              reducedQuotesArray[reducedQuotesArray.length - 2],
              reducedQuotesArray[reducedQuotesArray.length - 1],
            ),
          );
        }
      });
    }, requestDelay);
    return () => clearTimeout(apiRequestTimer);
  }, [mint]);

  const config = {
    autoFit: true,
    data: historicalQuotes,
    smooth: true,
    areaStyle: {
      fill:
        swapType === SwapType.from
          ? 'l(270) 0:#35363a 1:rgba(0, 255, 163, 0.24)'
          : 'l(270) 0:#35363a 1:rgba(1, 86, 255, 0.7)',
      fillOpacity: 0.1,
      cursor: 'pointer',
    },
    line: {
      color: swapType === SwapType.from ? '#6fe65a' : 'rgba(53, 103, 243, 1)',
      size: 3,
    },
  };

  const triangleComponent =
    percentageChange && percentageChange > 0 ? (
      <div className={styles.triangleTop}>&#9650;</div>
    ) : percentageChange && percentageChange < 0 ? (
      <div className={styles.triangleBottom}>&#9660;</div>
    ) : null;

  const percentageChangeComponent =
    percentageChange !== undefined ? (
      <Typography className={styles.lastPriceChange}>{percentageChange}%</Typography>
    ) : null;

  const lastPriceComponent =
    historicalQuotes.length > 0 ? (
      <Typography className={styles.price}>
        ${historicalQuotes[historicalQuotes.length - 1]?.toFixed(2)}
      </Typography>
    ) : null;

  return (
    <Box className={styles.wrapper}>
      <Box className={styles.tokenWrapper}>
        <TokenIcon mint={mint} style={{ width: '32px' }} />
        <Box className={styles.tokenInfoWrapper}>
          <Box className={styles.tokenNameAndDiffWrapper}>
            <TokenName
              mint={mint}
              style={{ textAlign: 'left', fontSize: 20, fontWeight: 700, margin: 0 }}
            />
            {triangleComponent}
            {percentageChangeComponent}
          </Box>
          {lastPriceComponent}
        </Box>
      </Box>
      <Box className={styles.chartWrapper}>
        <TinyArea {...config} />
      </Box>
    </Box>
  );
};
