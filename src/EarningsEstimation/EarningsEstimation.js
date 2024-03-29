import React, { Component } from 'react';
import FlexLoader from '../FlexLoader/FlexLoader';
import AssetField from '../AssetField/AssetField';
import { Card, Flex, Image, Text } from "rimble-ui";
import FunctionsUtil from '../utilities/FunctionsUtil';
import GenericSelector from '../GenericSelector/GenericSelector';
import TotalEarningsCounter from '../TotalEarningsCounter/TotalEarningsCounter';

class EarningsEstimation extends Component {
  state = {
    tokensEarnings:null,
    estimationStepsPerc:null,
    estimationStepsOptions:null,
    estimationStepsDefaultOption:null,
    estimationSteps:{
      0:{
        'Month':{
          perc:1/12,
          width:1/3
        },
        '2 months':{
          perc:1/6,
          width:1/3
        },
        '3 months':{
          perc:1/4,
          width:1/3,
          optionName:'3M'
        }
      },
      25:{
        '3 months':{
          perc:3/12,
          width:3/12
        },
        '8 months':{
          perc:8/12,
          width:5/12
        },
        'Year':{
          perc:1,
          width:4/12,
          optionName:'1Y'
        }
      },
      90:{
        'Year':{
          perc:1,
          width:1/3,
        },
        '2 Years':{
          perc:2,
          width:1/3,
        },
        '5 Years':{
          perc:5,
          width:3/5,
          optionName:'5Y'
        }
      }
    }
  };

  // Utils
  functionsUtil = null;

  loadUtils(){
    if (this.functionsUtil){
      this.functionsUtil.setProps(this.props);
    } else {
      this.functionsUtil = new FunctionsUtil(this.props);
    }
  }

  async componentWillMount(){
    this.loadUtils();
    this.loadEarnings();
  }

  async componentDidUpdate(prevProps,prevState){
    this.loadUtils();
  }

  setEstimationStepsPerc(estimationStepsPerc){
    this.setState({
      estimationStepsPerc
    });
  }

  async loadEarnings(){
    let stepsCount = {};
    let tokensEarnings = {};
    // let estimationStepsPerc = 0;

    const isRisk = this.props.selectedStrategy === 'risk';

    const aggregatedEarnings = {
      earnings:this.functionsUtil.BNify(0),
      amountLent:this.functionsUtil.BNify(0),
      earningsYear:this.functionsUtil.BNify(0),
    };

    await this.functionsUtil.asyncForEach(this.props.enabledTokens,async (token) => {
      const tokenConfig = this.props.availableTokens[token];
      const amountDeposited = await this.functionsUtil.getAmountDeposited(tokenConfig,this.props.account);

      const [amountLent,avgBuyPrice,idleTokenPrice] = await Promise.all([
        this.functionsUtil.convertTokenBalance(amountDeposited,token,tokenConfig,isRisk),
        this.functionsUtil.getAvgBuyPrice([token],this.props.account),
        this.functionsUtil.getIdleTokenPrice(tokenConfig)
      ]);

      const earningsPerc = idleTokenPrice.div(avgBuyPrice[token]).minus(1);
      const earnings = amountLent.times(earningsPerc);

      let earningsYear = 0;
      let tokenAPY = 0;
      const tokenAprs = await this.functionsUtil.getTokenAprs(tokenConfig);
      if (tokenAprs && tokenAprs.avgApr !== null){
        tokenAPY = tokenAprs.avgApy;
        earningsYear = amountLent.times(tokenAPY.div(100));
      }

      const earningsPercStep = Math.floor(earnings.div(earningsYear).times(100));
      
      const possibleSteps = Object.keys(this.state.estimationSteps).filter(perc => perc<=earningsPercStep);
      const maxPossibleStep = parseInt(possibleSteps.pop());

      stepsCount[maxPossibleStep] = stepsCount[maxPossibleStep] ? stepsCount[maxPossibleStep]+1 : 1;

      if (!this.functionsUtil.BNify(amountLent).isNaN() && !this.functionsUtil.BNify(idleTokenPrice).isNaN() && !this.functionsUtil.BNify(earnings).isNaN() && !this.functionsUtil.BNify(earningsYear).isNaN()){
        tokensEarnings[token] = {
          earnings,
          amountLent,
          earningsYear,
          idleTokenPrice
        };

        // const earningsUSD = await this.functionsUtil.convertTokenBalance(earningsYearings,token,tokenConfig,isRisk);
        // const amountLentUSD = await this.functionsUtil.convertTokenBalance(amountLent,token,tokenConfig,isRisk);
        // const earningsYearUSD = await this.functionsUtil.convertTokenBalance(earningsYear,token,tokenConfig,isRisk);

        aggregatedEarnings.earnings = aggregatedEarnings.earnings.plus(earnings);
        aggregatedEarnings.amountLent = aggregatedEarnings.amountLent.plus(amountLent);
        aggregatedEarnings.earningsYear = aggregatedEarnings.earningsYear.plus(earningsYear);
      }
    });

    const maxCountStep = Object.keys(stepsCount).reduce( (maxCountStep,step) => {
      const count = stepsCount[step];
      if (count>maxCountStep.count){
        maxCountStep.step = parseInt(step);
        maxCountStep.count = parseInt(count);
      }
      return maxCountStep;
    },{
      step:0,
      count:0
    });

    const estimationStepsPerc = maxCountStep.step || parseInt(Object.keys(this.state.estimationSteps)[1]);

    const orderedTokensEarnings = {};
    this.props.enabledTokens.forEach( token => {
      if (tokensEarnings[token]){
        orderedTokensEarnings[token] = tokensEarnings[token];
      }
    });

    tokensEarnings = orderedTokensEarnings;

    // Add USD aggregated earnings
    if (Object.keys(tokensEarnings).length>1){
      tokensEarnings['USD'] = aggregatedEarnings;
    }

    let estimationStepsDefaultOption = null;
    const estimationStepsOptions = Object.keys(this.state.estimationSteps).map( step => {
      const estimationStep = Object.values(this.state.estimationSteps[step]).pop();
      const label = estimationStep.optionName ? estimationStep.optionName : Object.keys(this.state.estimationSteps[step]).pop();
      const value = parseInt(step);
      const option = { value, label };

      if (value === estimationStepsPerc){
        estimationStepsDefaultOption = option;
      }
      return option;
    });

    this.setState({
      tokensEarnings,
      estimationStepsPerc,
      estimationStepsOptions,
      estimationStepsDefaultOption,
    });
  }

  render() {

    if (!this.state.tokensEarnings){
      return (
        <FlexLoader
          flexProps={{
            flexDirection:'row',
            minHeight:this.props.height
          }}
          loaderProps={{
            size:'30px'
          }}
          textProps={{
            ml:2
          }}
          text={'Loading estimations...'}
        />
      );
    }

    const estimationSteps = this.state.estimationSteps[this.state.estimationStepsPerc] ? this.state.estimationSteps[this.state.estimationStepsPerc] : this.state.estimationSteps[0];

    return (
      <Card
        pr={0}
        my={1}
        width={1}
        px={[3,4]}
        py={[2,3]}
        boxShadow={1}
        borderRadius={2}
        borderColor={'cardBorder'}
        backgroundColor={'cardBg'}
      >
        <Flex
          mt={2}
          mb={3}
          zIndex={9999}
          justifyContent={'flex-end'}
        >
          <Flex
            zIndex={9999}
            width={[1,0.2]}
            flexDirection={'column'}
          >
            <GenericSelector
              innerProps={{
                p:0,
                px:1
              }}
              name={'estimation-step'}
              options={this.state.estimationStepsOptions}
              onChange={ v => this.setEstimationStepsPerc(v) }
              defaultValue={this.state.estimationStepsDefaultOption}
            />
          </Flex>
        </Flex>
        {
          Object.keys(this.state.tokensEarnings).map((tokenKey,tokenIndex) => {
            const tokenConfig = this.props.availableTokens[tokenKey];
            const tokenEarnings = this.state.tokensEarnings[tokenKey];
            const token = tokenConfig ? tokenConfig.token : tokenKey;
            const estimationStepPerc = this.functionsUtil.BNify(Object.values(estimationSteps).pop().perc);
            const finalEarnings = tokenEarnings.earningsYear.times(estimationStepPerc);
            const cursorPerc = finalEarnings.gt(0) ? Math.min(1,parseFloat(tokenEarnings.earnings.div(finalEarnings))) : 1;
            const tokenIcon = tokenConfig && tokenConfig.icon ? tokenConfig.icon :`images/tokens/${token}.svg`;
            const tokenRGBColor = this.functionsUtil.getGlobalConfig(['stats','tokens',token.toUpperCase(),'color','rgb']).join(',');
            // console.log(tokenEarnings.earnings.toFixed(10),tokenEarnings.earningsYear.toFixed(10),finalEarnings.toFixed(10),cursorPerc.toFixed(10),estimationStepPerc.toFixed(10));
            return (
              <Flex
                id={`asset-${tokenKey}`}
                flexDirection={'row'}
                key={`asset-${tokenKey}`}
                borderTop={ token === 'USD' ? `1px solid ${this.props.theme.colors.divider}` : null }
              >
                <Flex
                  width={[1,0.93]}
                  position={'relative'}
                >
                  <Flex
                    width={1}
                    height={'100%'}
                    position={'absolute'}
                    alignItems={'center'}
                    flexDirection={'row'}
                    justifyContent={'center'}
                  >
                    <Flex
                      width={[0.15,0.1]}
                    >
                    </Flex>
                    <Flex
                      width={[0.85,0.9]}
                      height={'100%'}
                      flexDirection={'row'}
                    >
                      {
                        Object.keys(estimationSteps).map((label,estimateIndex) => {
                          const estimationStep = estimationSteps[label];
                          const estimationStepEarnings = tokenEarnings.earningsYear.times(this.functionsUtil.BNify(estimationStep.perc));
                          let estimationStepEarningsFormatted = this.functionsUtil.formatMoney(estimationStepEarnings,this.props.isMobile ? 2 : estimationStepEarnings.lt(1) ? 3 : 2);
                          const conversionRateField = this.functionsUtil.getGlobalConfig(['stats','tokens', token.toUpperCase(),'conversionRateField']);
                          if (conversionRateField){
                            estimationStepEarningsFormatted = '$ '+estimationStepEarningsFormatted;
                          }
                          return (
                            <Flex
                              pr={2}
                              justifyContent={'flex-end'}
                              width={estimationStep.width}
                              pt={ token === 'USD' ? 2 : null }
                              key={`asset-estimate-${tokenKey}-${estimateIndex}`}
                              borderRight={`1px solid ${this.props.theme.colors.divider}`}
                            >
                              {
                                (token === 'USD' || (estimateIndex === Object.keys(estimationSteps).length-1)) && 
                                  <Text
                                    fontWeight={3}
                                    fontSize={[0,'1em']}
                                    style={{
                                      wordBreak:'break-all'
                                    }}
                                    color={tokenEarnings.earnings.gte(estimationStepEarnings) ? 'copyColor' : 'legend'}
                                  >
                                    {estimationStepEarningsFormatted}
                                  </Text>
                              }
                            </Flex>
                          );
                        })
                      }
                    </Flex>
                  </Flex>
                  <Flex
                    width={1}
                    zIndex={1}
                    alignItems={'center'}
                    flexDirection={'row'}
                    justifyContent={'center'}
                    pt={ token === 'USD' ? ['2em','2.8em'] : '1.4em' }
                    pb={ tokenIndex<Object.keys(this.state.tokensEarnings).length-1 ? '1em' : 0 }
                  >
                    <Flex
                      width={[0.15,0.1]}
                      justifyContent={['flex-start','flex-end']}
                    >
                      <Text
                        pr={[0,2]}
                        fontSize={[0,3]}
                        fontWeight={[3,4]}
                      >
                        {token}
                      </Text>
                    </Flex>
                    <Flex
                      width={[0.85,0.9]}
                      alignItems={'center'}
                      flexDirection={'row'}
                      height={['20px','35px']}
                      justifyContent={'flex-start'}
                    >
                      <Flex
                        height={'100%'}
                        width={cursorPerc}
                        backgroundColor={'cardBg'}
                      >
                        <Flex
                          height={'100%'}
                          width={'100%'}
                          borderRadius={['0 20px 20px 0','0 35px 35px 0']}
                          style={{background:`linear-gradient(90deg, rgba(${tokenRGBColor},0) 0%, rgba(${tokenRGBColor},0.1) 30%, rgba(${tokenRGBColor},1) 100%)`}}
                        ></Flex>
                      </Flex>
                      <Flex
                        pl={2}
                        width={'auto'}
                        height={'100%'}
                        alignItems={'center'}
                        justifyContent={'flex-start'}
                      >
                        <Image src={tokenIcon} height={['1.4em','2.2em']} />
                      </Flex>
                      {
                        <Flex
                          pl={2}
                          alignItems={'center'}
                        >
                          {
                            token !== 'USD' ? (
                              <AssetField
                                {...this.props}
                                token={token}
                                tokenConfig={tokenConfig}
                                fieldInfo={{
                                  name:'earningsCounter',
                                  props:{
                                    decimals:this.props.isMobile ? 6 : 7,
                                    maxPrecision:this.props.isMobile ? 9 : 10,
                                    style:{
                                      color:this.props.theme.colors.copyColor,
                                      fontWeight:this.props.isMobile ? 500 : 700,
                                      fontSize:this.props.isMobile ? '14px' : '22px',
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <TotalEarningsCounter
                                {...this.props}
                                decimals={this.props.isMobile ? 6 : 7}
                                maxPrecision={this.props.isMobile ? 9 : 10}
                                counterStyle={{
                                  color:this.props.theme.colors.copyColor,
                                  fontWeight:this.props.isMobile ? 500 : 700,
                                  fontFamily:this.props.theme.fonts.sansSerif,
                                  fontSize:this.props.isMobile ? '14px' : '22px',
                                }}
                              />
                            )
                          }
                        </Flex>
                      }
                    </Flex>
                  </Flex>
                </Flex>
                {
                  !this.props.isMobile && 
                    <Flex width={0.07} alignItems={'flex-start'} justifyContent={'flex-end'}>
                    </Flex>
                }
              </Flex>
            )
          })
        }
        <Flex
          flexDirection={'row'}
        >
          <Flex
            width={[1,0.93]}
            position={'relative'}
          >
            <Flex
              width={1}
              alignItems={'center'}
              flexDirection={'row'}
              justifyContent={'center'}
            >
              <Flex width={[0.15,0.1]}></Flex>
              <Flex
                width={[0.85,0.9]}
                flexDirection={'row'}
              >
                {
                  Object.keys(estimationSteps).map((estimationLabel,estimateIndex) => {
                    const estimationStep = estimationSteps[estimationLabel];
                    return (
                      <Flex
                        pt={2}
                        pr={[1,2]}
                        justifyContent={'flex-end'}
                        width={estimationStep.width}
                        key={`estimate-label-${estimateIndex}`}
                        borderRight={`1px solid ${this.props.theme.colors.divider}`}
                      >
                        <Text
                          fontWeight={3}
                          fontSize={[0,2]}
                          color={'legend'}
                        >
                          {estimationLabel}
                        </Text>
                      </Flex>
                    );
                  })
                }
              </Flex>
            </Flex>
          </Flex>
          {
            !this.props.isMobile && 
              <Flex width={0.07} alignItems={'flex-start'} justifyContent={'center'}>
                <Text fontWeight={4} fontSize={3}></Text>
              </Flex>
          }
        </Flex>
      </Card>
    );
  }
}

export default EarningsEstimation;
