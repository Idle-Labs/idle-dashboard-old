import IconBox from '../IconBox/IconBox';
import ExtLink from '../ExtLink/ExtLink';
import React, { Component } from 'react';
import FlexLoader from '../FlexLoader/FlexLoader';
import ImageButton from '../ImageButton/ImageButton';
import TooltipText from '../TooltipText/TooltipText';
import RoundButton from '../RoundButton/RoundButton';
import FunctionsUtil from '../utilities/FunctionsUtil';
// import BuyModal from '../utilities/components/BuyModal';
import TrancheField from '../TrancheField/TrancheField';
import { Flex, Text, Image, Box, Icon } from "rimble-ui";
import DashboardCard from '../DashboardCard/DashboardCard';
import ShareModal from '../utilities/components/ShareModal';
import CardIconButton from '../CardIconButton/CardIconButton';
import GenericModal from '../utilities/components/GenericModal';
import GenericSelector from '../GenericSelector/GenericSelector';
import SendTxWithBalance from '../SendTxWithBalance/SendTxWithBalance';
import LimitReachedModal from '../utilities/components/LimitReachedModal';
import ExecuteTransaction from '../ExecuteTransaction/ExecuteTransaction';

class TrancheDetails extends Component {

  state = {
    eventData:{},
    infoText:null,
    modalApy:null,
    trancheFee:null,
    trancheAPY:null,
    canUnstake:null,
    canWithdraw:null,
    activeModal:null,
    actionLabel:null,
    balanceProp:null,
    lastHarvest:null,
    tokenConfig:null,
    contractInfo:null,
    tranchePrice:null,
    tokenBalance:null,
    unlentAmount:null,
    stakeEnabled:true,
    stakedBalance:null,
    unstakeEnabled:true,
    trancheBaseApy:null,
    trancheBalance:null,
    stakingEnabled:true,
    approveEnabled:null,
    contractPaused:false,
    buttonDisabled:false,
    selectedTranche:null,
    allowAAWithdraw:false,
    allowBBWithdraw:false,
    claimedNFTAmount:null,
    availableTranches:null,
    pendingNFTAmounts:null,
    modalAction:'deposited',
    approveDescription:null,
    gaugeStakedBalance:null,
    selectedAction:'deposit',
    poolUtilizationRate:null,
    balanceSelectorInfo:null,
    selectedTrancheOption:null,
    selectedStakeAction:'stake',
    userHasAvailableFunds:false,
    maxPoolUtilizationRateReached:null
  }

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
    this.loadData();
    this.checkModal();
  }

  async componentDidUpdate(prevProps,prevState){
    this.loadUtils();

    const accountChanged = this.props.account !== prevProps.account;
    if (accountChanged){
      this.loadData();
    }

    const selectedActionChanged = prevState.selectedAction !== this.state.selectedAction;
    const selectedStakeActionChanged = prevState.selectedStakeAction !== this.state.selectedStakeAction;
    if (selectedActionChanged || selectedStakeActionChanged){
      this.loadActionData();
    }
  }

  checkModal(){
    const modalEnabled = this.props.tokenConfig.modal && this.props.tokenConfig.modal.enabled;
    if (modalEnabled){
      const modalAlreadyOpened = this.functionsUtil.getStoredItem(this.props.tokenConfig.modal.id);
      if (!modalAlreadyOpened){
        this.setState({
          activeModal:this.props.tokenConfig.modal.id
        });
      }
    }
  }

  async loadData(){

    // Init Pool contract
    if (this.props.tokenConfig.Pool){
      await this.functionsUtil.initContract(this.props.tokenConfig.Pool.name, this.props.tokenConfig.Pool.address, this.props.tokenConfig.Pool.abi);
    }

    console.log('loadData', this.props.tokenConfig, this.props.trancheConfig, this.props.gaugeConfig);

    const [
      unlentAmount,
      tokenBalance,
      trancheBalance,
      contractPaused,
      lastHarvest,
      allowAAWithdraw,
      allowBBWithdraw,
      gaugeStakedBalance,
      poolUtilizationRate,
      stakedBalance,
      trancheFee,
      trancheAPY,
      tranchePrice,
      trancheBaseApy,
      pendingNFTs,
    ] = await Promise.all([
      this.functionsUtil.getTrancheUnlentAmount(this.props.tokenConfig),
      this.functionsUtil.getTokenBalance(this.props.selectedToken,this.props.account),
      this.functionsUtil.getTokenBalance(this.props.trancheConfig.name,this.props.account),
      this.functionsUtil.genericContractCallCached(this.props.tokenConfig.CDO.name, 'paused'),
      this.functionsUtil.getTrancheLastHarvest(this.props.tokenConfig,this.props.trancheConfig),
      this.functionsUtil.genericContractCallCached(this.props.tokenConfig.CDO.name, 'allowAAWithdraw'),
      this.functionsUtil.genericContractCallCached(this.props.tokenConfig.CDO.name, 'allowBBWithdraw'),
      this.props.gaugeConfig ? this.functionsUtil.getTokenBalance(this.props.gaugeConfig.name, this.props.account) : null,
      this.props.trancheConfig.functions.utilizationRate ? this.functionsUtil.genericContractCallCached(this.props.tokenConfig.Pool.name, this.props.trancheConfig.functions.utilizationRate) : null,
      this.functionsUtil.getTrancheStakedBalance(this.props.trancheConfig.CDORewards.name,this.props.account,this.props.trancheConfig.CDORewards.decimals,this.props.trancheConfig.functions.stakedBalance),
      this.functionsUtil.loadTrancheField('trancheFee',{},this.props.selectedProtocol,this.props.selectedToken,this.props.selectedTranche,this.props.tokenConfig,this.props.trancheConfig,this.props.account),
      this.functionsUtil.loadTrancheFieldRaw('trancheApy',{},this.props.selectedProtocol,this.props.selectedToken,this.props.selectedTranche,this.props.tokenConfig,this.props.trancheConfig,this.props.account),
      this.functionsUtil.loadTrancheFieldRaw('tranchePrice',{},this.props.selectedProtocol,this.props.selectedToken,this.props.selectedTranche,this.props.tokenConfig,this.props.trancheConfig,this.props.account),
      this.functionsUtil.loadTrancheFieldRaw('trancheBaseApy',{},this.props.selectedProtocol,this.props.selectedToken,this.props.selectedTranche,this.props.tokenConfig,this.props.trancheConfig,this.props.account),
      this.props.trancheConfig.functions.pendingNFTAmount && this.functionsUtil[this.props.trancheConfig.functions.pendingNFTAmount] ? this.functionsUtil[this.props.trancheConfig.functions.pendingNFTAmount](this.props.account) : null
    ]);

    const canUnstake = true; // !stakeCoolingPeriod || this.functionsUtil.BNify(userStakeBlock).plus(stakeCoolingPeriod).lt(blockNumber);
    const canWithdraw = true; // !cdoCoolingPeriod || !latestHarvestBlock || this.functionsUtil.BNify(latestHarvestBlock).plus(cdoCoolingPeriod).lt(blockNumber);

    // console.log('lastHarvest', lastHarvest);
    // console.log('pendingNFTs', pendingNFTs);
    // console.log('loadData',this.props.trancheConfig.tranche,blockNumber,cdoCoolingPeriod,latestHarvestBlock,stakeCoolingPeriod,userStakeBlock,canUnstake,canWithdraw);
    // console.log('utilizationRate', this.props.trancheConfig.functions.utilizationRate, poolUtilizationRate);

    const pendingNFTAmounts = pendingNFTs ? pendingNFTs.reduce( (nfts, pendingNFT) => {
      // Just keep one available NFT to withdraw at a time
      if (pendingNFT.status === 'available' && nfts[pendingNFT.status]) return nfts;

      if (!nfts[pendingNFT.status]) {
        nfts[pendingNFT.status] = {
          tokenIds:[],
          maxUnlockDate:null,
          amount:this.functionsUtil.BNify(0),
          currentEpoch:pendingNFT.currentEpoch
        };
      }
      if (!nfts[pendingNFT.status].maxUnlockDate || pendingNFT.unlockDate.isAfter(nfts[pendingNFT.status].maxUnlockDate)){
        nfts[pendingNFT.status].maxUnlockDate = pendingNFT.unlockDate;
      }
      nfts[pendingNFT.status].tokenIds.push(pendingNFT.tokenId);
      nfts[pendingNFT.status].amount = nfts[pendingNFT.status].amount.plus(pendingNFT.amount);
      return nfts;
    }, {}) : null;

    const availableTranches = Object.values(this.functionsUtil.getGlobalConfig(['tranches'])).map( trancheInfo => ({
      value: trancheInfo.type,
      icon: trancheInfo.image,
      label: trancheInfo.name,
      tranche: trancheInfo.type,
      trancheConfig: this.props.tokenConfig[trancheInfo.type]
    }));

    const userHasAvailableFunds = trancheBalance && trancheBalance.gt(0);
    const selectedTrancheOption = availableTranches.find( trancheInfo => trancheInfo.value === this.props.selectedTranche );
    const selectedTranche = selectedTrancheOption.value;

    const stakingRewards = this.props.trancheConfig.CDORewards.stakingRewards.filter( t => t.enabled );
    let stakingEnabled = stakingRewards.length>0;
    const stakeEnabled = stakingEnabled;
    const unstakeEnabled = stakedBalance && this.functionsUtil.BNify(stakedBalance).gt(0);

    if (!stakingEnabled && unstakeEnabled){
      stakingEnabled = true;
    }

    let selectedStakeAction = 'stake';
    if (!stakeEnabled && unstakeEnabled){
      selectedStakeAction = 'unstake';
    }

    const maxPoolUtilizationRateReached = this.props.tokenConfig.maxUtilizationRate && !this.functionsUtil.BNify(poolUtilizationRate).isNaN() && this.functionsUtil.fixTokenDecimals(poolUtilizationRate, 18).gte(this.props.tokenConfig.maxUtilizationRate);

    this.setState({
      trancheAPY,
      trancheFee,
      canUnstake,
      canWithdraw,
      lastHarvest,
      unlentAmount,
      tokenBalance,
      stakeEnabled,
      tranchePrice,
      stakedBalance,
      contractPaused,
      trancheBaseApy,
      stakingEnabled,
      trancheBalance,
      unstakeEnabled,
      selectedTranche,
      allowAAWithdraw,
      allowBBWithdraw,
      pendingNFTAmounts,
      availableTranches,
      gaugeStakedBalance,
      poolUtilizationRate,
      selectedStakeAction,
      selectedTrancheOption,
      userHasAvailableFunds,
      maxPoolUtilizationRateReached
    }, () => {
      this.loadActionData();
    });
  }

  loadActionData = async () => {
    let infoBox = null;
    let balanceProp = null;
    let tokenConfig = null;
    let contractInfo = null;
    let approveEnabled = null;
    let buttonDisabled = false;
    let balanceSelectorInfo = null;
    let eventData = {
      eventAction:this.props.trancheConfig.token
    };

    let actionLabel = this.state.selectedAction;
    const trancheDetails = this.functionsUtil.getGlobalConfig(['tranches',this.props.selectedTranche]);
    let infoText = this.functionsUtil.getArrayPath(['messages',this.state.selectedAction],this.props.tokenConfig) || trancheDetails.description[this.state.selectedAction];

    switch (this.state.selectedAction){
      case 'deposit':
        approveEnabled = true;
        contractInfo = this.props.cdoConfig;
        tokenConfig = this.props.tokenConfig;
        balanceProp = this.state.tokenBalance;

        // Set data for ga custom event
        eventData.eventCategory = 'Deposit';

        if (this.state.trancheFee){
          balanceSelectorInfo = {
            text:`Performance fee: ${this.state.trancheFee}`,
            tooltip:this.functionsUtil.getGlobalConfig(['messages', 'performanceFee'])
          }
        }
        
        if (this.props.gaugeConfig && this.props.gaugeConfig.trancheToken.token.toLowerCase() === this.props.tokenConfig[this.props.selectedTranche].token.toLowerCase() && this.state.trancheBalance && this.state.trancheBalance.gt(0)){
          infoText = `Stake your tranche tokens (${this.props.gaugeConfig.trancheToken.token}) in the Liquidity Gauge and get additional rewards.`;
        }

        // Disabled info text for disabled tranche
        if (!!this.props.tokenConfig.disabled){
          infoText = null;
        }
      break;
      case 'stake':
        actionLabel = this.state.selectedStakeAction;
        if (this.state.stakingEnabled){
          infoText = trancheDetails.description[this.state.selectedStakeAction];
        } else {
          infoText = null;
        }

        // Set data for ga custom event
        eventData.eventCategory = this.functionsUtil.capitalize(this.state.selectedStakeAction);

        switch (this.state.selectedStakeAction){
          case 'stake':
            // Disable staking deposit if gaugeConfig is set or the tranche is disabled
            if (this.props.gaugeConfig || !this.state.stakeEnabled || !this.props.tokenConfig.enabled){
              infoText = null;
            }
            approveEnabled = true;
            tokenConfig = this.props.trancheConfig;
            balanceProp = this.state.trancheBalance;
            contractInfo = this.props.trancheConfig.CDORewards;
          break;
          case 'unstake':
            approveEnabled = false;
            tokenConfig = this.props.trancheConfig;
            contractInfo = this.props.trancheConfig.CDORewards;
            balanceProp = this.state.stakedBalance;
            if (!this.state.canUnstake){
              buttonDisabled = true;
              infoText = trancheDetails.description.cantUnstake;
            }
          break;
          default:
          break;
        }
      break;
      case 'withdraw':
        approveEnabled = false;
        contractInfo = this.props.cdoConfig;
        // tokenConfig = this.props.trancheConfig;
        // balanceProp = this.state.trancheBalance;

        tokenConfig = this.props.tokenConfig;
        balanceProp = this.state.trancheBalance ? this.state.trancheBalance.times(this.state.tranchePrice) : null;

        // Set data for ga custom event
        eventData.eventCategory = 'Redeem';

        // console.log('balanceProp',this.state.trancheBalance,this.state.tranchePrice,balanceProp);

        if (!this.state.canWithdraw){
          buttonDisabled = true;
          infoText = trancheDetails.description.cantWithdraw;
          // infoBox = {
          //   text:'You need to wait 1 block from the last ',
          //   icon:'Warning',
          //   iconProps:{
          //     color:'cellText'
          //   },
          // };
        } else {
          // Overwrite default action message
          if (this.props.selectedTranche === 'AA' && this.functionsUtil.BNify(this.state.gaugeStakedBalance).gt(0)){
            infoText = `To withdraw your ${this.props.selectedToken} make sure to unstake the tranche tokens from the <a href="${this.functionsUtil.getDashboardSectionUrl(`gauges/${this.props.selectedToken}`)}" class="link">${this.props.selectedToken} Gauge</a> first.`;
          }
        }
      break;
      default:
      break;
    }

    const approveDescription = tokenConfig ? `To ${this.state.selectedAction} your <strong>${tokenConfig.token}</strong> you need to approve the Smart-Contract first.` : null;

    this.setState({
      infoBox,
      infoText,
      eventData,
      actionLabel,
      tokenConfig,
      balanceProp,
      contractInfo,
      buttonDisabled,
      approveEnabled,
      approveDescription,
      balanceSelectorInfo
    })
  }

  changeInputCallback = async (inputValue) => {

    if (this.state.selectedAction === 'withdraw'){
      // Calculate exit fee for TrueFi - USDC
      if (this.props.trancheConfig.functions.penaltyFee && this.props.tokenConfig.Pool && this.functionsUtil.BNify(inputValue).gt(0)){
        const amount = this.functionsUtil.normalizeTokenAmount(inputValue, this.props.tokenConfig.decimals);
        let penaltyFee = await this.functionsUtil.genericContractCall(this.props.tokenConfig.Pool.name, this.props.trancheConfig.functions.penaltyFee, [amount])

        if (penaltyFee){
          penaltyFee = this.functionsUtil.BNify(10000).minus(penaltyFee).div(100)
          const balanceSelectorInfo = {
            text:`Penalty fee: <span style="color:${this.props.theme.colors.alert}">${penaltyFee.toFixed(2)}%</span>`
          }

          this.setState({
            balanceSelectorInfo
          });
        }
      // Handle max unlent amount while max Utilization Rate reached
      } else {
        let buttonDisabled = false;
        if (this.state.maxPoolUtilizationRateReached && this.state.unlentAmount.gt(0) && this.functionsUtil.BNify(inputValue).gt(this.state.unlentAmount)){
          buttonDisabled = true;
        }
        this.setState({
          buttonDisabled
        });
      }
    }
  }

  contractApprovedCallback(){

  }

  getTransactionParams = (amount,selectedPercentage) => {
    let methodName = null;
    let methodParams = null;
    const _referral = this.getReferralAddress();
    const referralEnabled = this.props.tokenConfig.referralEnabled;

    if (this.props.trancheConfig.functions[this.state.selectedAction]){
      methodName = this.props.trancheConfig.functions[this.state.selectedAction];

      if (this.state.selectedAction === 'deposit' && _referral && referralEnabled){
        methodParams = [amount,_referral];
      } else if (this.state.selectedAction === 'withdraw'){
        let trancheTokenToRedeem = null;
        if (selectedPercentage) {
          trancheTokenToRedeem = this.functionsUtil.BNify(this.state.trancheBalance).times(this.functionsUtil.BNify(selectedPercentage).div(100));
        } else {
          trancheTokenToRedeem = this.functionsUtil.BNify(amount).div(this.functionsUtil.normalizeTokenAmount(this.state.tranchePrice, this.props.tokenConfig.decimals));
        }

        // Check if idleTokens to redeem > idleToken balance
        if (trancheTokenToRedeem.gt(this.functionsUtil.BNify(this.state.trancheBalance))) {
          trancheTokenToRedeem = this.functionsUtil.BNify(this.state.trancheBalance);
        }

        // Normalize number
        trancheTokenToRedeem = this.functionsUtil.normalizeTokenAmount(trancheTokenToRedeem, 18);

        methodParams = [trancheTokenToRedeem];
      } else {
        if (this.state.selectedAction === 'stake'){
          methodName = this.props.trancheConfig.functions[this.state.selectedStakeAction];
        }

        methodParams = [amount];
      }
    }

    // console.log('getTransactionParams',this.state.selectedAction,amount,methodName,methodParams);

    return {
      methodName,
      methodParams
    };
  }

  async checkLimit(amount){
    const trancheLimit = this.functionsUtil.BNify(this.props.tokenConfig.limit);
    if (trancheLimit.gt(0)){
      const poolSize = await this.functionsUtil.loadTrancheFieldRaw(`pool`,{},this.props.selectedProtocol,this.props.selectedToken,this.props.selectedTranche,this.props.tokenConfig,this.props.trancheConfig,this.props.account);
      if (poolSize.plus(amount).gt(trancheLimit)){
        this.setState({
          activeModal:'limit'
        })
        return false;
      }
    }
    return true;
  }

  claimNFTSucceeded(tx){
    const eventConfig = this.props.tokenConfig.ClaimNFT.event;

    const claimTokensEvent = tx.txReceipt.events ? tx.txReceipt.events[eventConfig.name] : null;
    const claimedNFTAmount = claimTokensEvent ? this.functionsUtil.fixTokenDecimals(claimTokensEvent.returnValues[eventConfig.amountField], this.props.tokenConfig.decimals) : this.functionsUtil.BNify(0);

    this.setState({
      claimedNFTAmount
    });
  }

  transactionSucceeded(){

    this.loadData();

    if (typeof this.props.transactionSucceeded === 'function'){
      this.props.transactionSucceeded();
    }

    switch (this.state.selectedAction){
      case 'stake':
      case 'deposit':
        if (this.state.selectedAction === 'deposit' || this.state.selectedStakeAction === 'stake'){
          const modalAction = this.state.selectedAction === 'deposit' ? 'deposited' : 'staked';
          const modalApy = this.state.selectedAction === 'deposit' ? this.state.trancheBaseApy : this.state.trancheAPY;
          this.setState({
            modalApy,
            modalAction,
            activeModal:'share'
          });
        }
      break;
      default:
      break;
    }
  }

  resetModal = () => {
    this.setState({
      activeModal: null
    });
  }

  setSelectedAction(selectedAction){
    this.setState({
      selectedAction
    });
  }

  setStakeAction(selectedStakeAction){
    this.setState({
      selectedStakeAction
    });
  }

  selectTranche(trancheType){
    // console.log('selectTranche',trancheType);
    const trancheDetails = this.functionsUtil.getGlobalConfig(['tranches',trancheType]);
    if (trancheDetails){
      this.props.selectTrancheType(trancheDetails.route);
    }
  }

  getReferralAddress() {
    let _referral = this.functionsUtil.getQueryStringParameterByName('_referral');
    if (!this.functionsUtil.checkAddress(_referral)) {
      _referral = null;
    }
    return _referral;
  }

  render() {

    const isStake = this.state.selectedAction === 'stake';
    const isDeposit = this.state.selectedAction === 'deposit';
    const isWithdraw = this.state.selectedAction === 'withdraw';
    const isDisabled = !!this.props.tokenConfig.disabled;

    const unlentAmount = this.state.unlentAmount || this.functionsUtil.BNify(0);

    let maxPoolUtilizationRateReachedText = `This pool has reached the maximum utilization rate (${(this.props.tokenConfig.maxUtilizationRate*100).toFixed(0)}%), `;
    if (unlentAmount.gt(0)){
      maxPoolUtilizationRateReachedText = maxPoolUtilizationRateReachedText.concat(`you can withdraw up to ${unlentAmount.toFixed(4)} ${this.props.tokenConfig.token}`);
    } else {
      maxPoolUtilizationRateReachedText = maxPoolUtilizationRateReachedText.concat(`therefore ${this.state.selectedAction}s are temporarily unavailable.`);
    }

    const withdrawEnabled = ((this.props.trancheConfig.tranche === 'AA' && this.state.allowAAWithdraw) || (this.props.trancheConfig.tranche === 'BB' && this.state.allowBBWithdraw));

    const stakingRewards = this.props.trancheConfig.CDORewards.stakingRewards.filter( t => t.enabled );
    const trancheLimit = this.functionsUtil.formatMoney(this.functionsUtil.BNify(this.props.tokenConfig.limit),0)+' '+this.props.selectedToken;

    const _referral = this.getReferralAddress();
    const showReferral = !this.state.contractPaused && this.props.tokenConfig.referralEnabled && this.state.userHasAvailableFunds && _referral && isDeposit;

    const modalEnabled = this.props.tokenConfig.modal && this.props.tokenConfig.modal.enabled;

    const CustomOptionValue = props => {
      const selectedOption = props.options.find( option => option.value === props.value );
      if (!selectedOption){
        return null;
      }

      return (
        <Flex
          width={1}
          alignItems={'center'}
          flexDirection={'row'}
          justifyContent={'space-between'}
        >
          <Flex
            alignItems={'center'}
          >
            <Image
              mr={2}
              src={selectedOption.icon}
              size={this.props.isMobile ? '1.6em' : '1.8em'}
            />
            <Text
              fontWeight={3}
            >
              {props.label}
            </Text>
          </Flex>
        </Flex>
      );
    }

    const CustomValueContainer = props => {
      const selectProps = props.selectProps.options.find( option => option.value === props.selectProps.value.value );
      // console.log('CustomValueContainer',props.selectProps.options,props.selectProps.value,selectProps);
      if (!selectProps){
        return null;
      }
      return (
        <Flex
          style={{
            flex:'1'
          }}
          justifyContent={'space-between'}
          {...props.innerProps}
        >
          <Flex
            p={0}
            width={1}
            {...props.innerProps}
            alignItems={'center'}
            flexDirection={'row'}
            style={{cursor:'pointer'}}
            justifyContent={'flex-start'}
          >
            <Image
              mr={2}
              src={selectProps.icon}
              size={this.props.isMobile ? '1.6em' : '1.8em'}
            />
            <Text
              fontWeight={3}
            >
              {selectProps.label}
            </Text>
          </Flex>
        </Flex>
      );
    }

    return (
      <Flex
        width={1}
        alignItems={'center'}
        flexDirection={'column'}
        justifyContent={'center'}
      >
        {
          !this.state.availableTranches ? (
            <Flex
              mt={4}
              flexDirection={'column'}
            >
              <FlexLoader
                flexProps={{
                  flexDirection:'row'
                }}
                loaderProps={{
                  size:'30px'
                }}
                textProps={{
                  ml:2
                }}
                text={'Loading tranches...'}
              />
            </Flex>
          ) : (
            <Flex
              width={1}
              alignItems={'center'}
              flexDirection={'column'}
              justifyContent={'center'}
              maxWidth={['100%','42em']}
            >
              <Box
                width={1}
              >
                <Text
                  mb={1}
                >
                  Select Tranche:
                </Text>
                <GenericSelector
                  {...this.props}
                  name={'tranches'}
                  isSearchable={false}
                  CustomOptionValue={CustomOptionValue}
                  options={this.state.availableTranches}
                  onChange={this.selectTranche.bind(this)}
                  CustomValueContainer={CustomValueContainer}
                  defaultValue={this.state.selectedTrancheOption}
                />
              </Box>
              <Box
                mt={2}
                width={1}
              >
                <Text
                  mb={1}
                >
                  Tranche details:
                </Text>
                <DashboardCard
                  cardProps={{
                    py:1,
                    px:3,
                    mb:2
                  }}
                  isActive={false}
                >
                  <Flex
                    mt={1}
                    mb={1}
                    width={1}
                    style={{
                      flexBasis:'0',
                      flex:'1 1 0px',
                      flexWrap:'wrap'
                    }}
                    flexDirection={'row'}
                    justifyContent={'space-between'}
                  >
                    <Flex
                      mb={[2,3]}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <Text
                        fontWeight={3}
                        fontSize={[1,2]}
                        color={'primary'}
                        fontFamily={'titles'}
                      >
                        Protocol
                      </Text>
                      <Flex
                        mt={1}
                        alignItems={'center'}
                        flexDirection={'row'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'protocolIcon',
                            props:{
                              mr:2,
                              height:['1.4em','2em']
                            }
                          }}
                          token={this.props.selectedToken}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'protocolName',
                            props:{
                              fontSize:[1,2],
                              color:'copyColor'
                            }
                          }}
                          token={this.props.selectedToken}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                      </Flex>
                    </Flex>
                    <Flex
                      mb={[2,3]}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <Text
                        fontWeight={3}
                        fontSize={[1,2]}
                        color={'primary'}
                        fontFamily={'titles'}
                      >
                        Token
                      </Text>
                      <Flex
                        mt={1}
                        alignItems={'center'}
                        flexDirection={'row'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'tokenIcon',
                            props:{
                              mr:2,
                              height:['1.4em','2em']
                            }
                          }}
                          token={this.props.selectedToken}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'tokenName',
                            props:{
                              fontSize:[1,2],
                              color:'copyColor'
                            }
                          }}
                          token={this.props.selectedToken}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                      </Flex>
                    </Flex>
                    <Flex
                      mb={[2,3]}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <Text
                        fontWeight={3}
                        fontSize={[1,2]}
                        color={'primary'}
                        fontFamily={'titles'}
                      >
                        Pool Size
                      </Text>
                      <Flex
                        mt={1}
                        alignItems={'center'}
                        flexDirection={'row'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'tranchePool',
                            props:{
                              decimals:2,
                              fontSize:[1,2],
                              minPrecision:2,
                              color:'copyColor'
                            }
                          }}
                          token={this.props.selectedToken}
                          tranche={this.props.selectedTranche}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                      </Flex>
                    </Flex>
                    <Flex
                      mb={2}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <TooltipText
                        textProps={{
                          fontSize:[1,2],
                          color:'primary',
                          fontWeight:[2,3],
                          fontFamily:'ctas',
                        }}
                        text={'Auto-Compounding'}
                        message={this.functionsUtil.getGlobalConfig(['messages','autoFarming'])}
                      />
                      <Flex
                        mt={1}
                        alignItems={'center'}
                        flexDirection={'row'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'autoFarming',
                            props:{
                              decimals:2,
                              fontSize:[1,2],
                              color:'copyColor'
                            }
                          }}
                          token={this.props.selectedToken}
                          tranche={this.props.selectedTranche}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                      </Flex>
                    </Flex>
                    <Flex
                      mb={2}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <TooltipText
                        textProps={{
                          fontSize:[1,2],
                          color:'primary',
                          fontWeight:[2,3],
                          fontFamily:'ctas',
                        }}
                        text={'Staking Rewards'}
                        message={this.functionsUtil.getGlobalConfig(['messages','stakingRewards'])}
                      />
                      <Flex
                        mt={1}
                        alignItems={'center'}
                        flexDirection={'row'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'stakingRewards',
                            props:{
                              decimals:2,
                              fontSize:[1,2],
                              color:'copyColor'
                            }
                          }}
                          token={this.props.selectedToken}
                          tranche={this.props.selectedTranche}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                      </Flex>
                    </Flex>
                    <Flex
                      mb={2}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <TooltipText
                        textProps={{
                          fontSize:[1,2],
                          color:'primary',
                          fontWeight:[2,3],
                          fontFamily:'ctas',
                        }}
                        text={'APY'}
                        message={this.functionsUtil.getGlobalConfig(['messages','apyTranches'])}
                      />
                      <Flex
                        flexDirection={'column'}
                        alignItems={'flex-start'}
                        justifyContent={'flex-start'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'trancheApyWithTooltip',
                            props:{
                              decimals:2,
                              fontSize:[1,2],
                              color:'copyColor'
                            }
                          }}
                          token={this.props.selectedToken}
                          tranche={this.props.selectedTranche}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                        {
                          stakingRewards.length>0 && (
                            <Flex
                              width={1}
                              flexDirection={'row'}
                              alignItems={'flex-start'}
                            >
                              <TrancheField
                                {...this.props}
                                fieldInfo={{
                                  name:'trancheIDLELastHarvest',
                                  props:{
                                    decimals:4,
                                    fontSize:1,
                                    fontWeight:2,
                                    lineHeight:'1',
                                    color:'cellText'
                                  }
                                }}
                                token={this.props.selectedToken}
                                tranche={this.props.selectedTranche}
                                tokenConfig={this.props.tokenConfig}
                                protocol={this.props.selectedProtocol}
                                trancheConfig={this.props.trancheConfig}
                              />
                            </Flex>
                          )
                        }
                      </Flex>
                    </Flex>
                    <Flex
                      mb={2}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <TooltipText
                        textProps={{
                          fontSize:[1,2],
                          color:'primary',
                          fontWeight:[2,3],
                          fontFamily:'ctas',
                        }}
                        text={'APY Ratio'}
                        message={this.functionsUtil.getGlobalConfig(['messages','aprRatio'])}
                      />
                      <Flex
                        mt={1}
                        alignItems={'center'}
                        flexDirection={'row'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            props:{
                              fontSize:[1,2],
                              color:'copyColor'
                            },
                            name:'trancheAPRRatio'
                          }}
                          token={this.props.selectedToken}
                          tranche={this.props.selectedTranche}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                      </Flex>
                    </Flex>
                    <Flex
                      mb={2}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <Text
                        fontWeight={3}
                        fontSize={[1,2]}
                        color={'primary'}
                        fontFamily={'titles'}
                      >
                        Status
                      </Text>
                      <Flex
                        mt={1}
                        alignItems={'center'}
                        flexDirection={'row'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            name:'statusBadge'
                          }}
                          token={this.props.selectedToken}
                          tranche={this.props.selectedTranche}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                      </Flex>
                    </Flex>
                    <Flex
                      mb={2}
                      width={['49%','33%']}
                      flexDirection={'column'}
                    >
                      <Text
                        fontWeight={3}
                        fontSize={[1,2]}
                        color={'primary'}
                        fontFamily={'titles'}
                      >
                        {
                          this.props.selectedTranche === 'AA' ? 'Senior Coverage' : 'APY Boost'
                        }
                      </Text>
                      <Flex
                        mt={1}
                        alignItems={'center'}
                        flexDirection={'row'}
                      >
                        <TrancheField
                          {...this.props}
                          fieldInfo={{
                            props:{
                              decimals:2,
                              minPrecision:2,
                              fontSize:[1,2],
                              color:'copyColor'
                            },
                            name:this.props.selectedTranche === 'AA' ? 'seniorCoverage' : 'apyBoost'
                          }}
                          token={this.props.selectedToken}
                          tranche={this.props.selectedTranche}
                          tokenConfig={this.props.tokenConfig}
                          protocol={this.props.selectedProtocol}
                          trancheConfig={this.props.trancheConfig}
                        />
                      </Flex>
                    </Flex>
                  </Flex>
                  {
                    (this.props.tokenConfig.description || this.state.lastHarvest) && (
                      <Flex
                        mb={2}
                        width={1}
                        flexDirection={'column'}
                      >
                        {
                          this.props.tokenConfig.description && (
                            <Flex
                              pt={2}
                              width={1}
                              flexDirection={'column'}
                              borderTop={`1px solid ${this.props.theme.colors.divider}`}
                            >
                              <Text
                                fontSize={[1,2]}
                                color={'primary'}
                                fontWeight={[2,3]}
                              >
                                Strategy Description
                              </Text>
                              <Flex
                                mt={1}
                                alignItems={'center'}
                                flexDirection={'row'}
                              >
                                <Text
                                  fontWeight={2}
                                  fontSize={'15px'}
                                  textAlign={'justify'}
                                  dangerouslySetInnerHTML={{__html:this.props.tokenConfig.description}}
                                >
                                </Text>
                              </Flex>
                            </Flex>
                          )
                        }
                        {
                          this.state.lastHarvest && (
                            <Flex
                              pt={2}
                              flexDirection={'column'}
                              alignItems={'flex-start'}
                              mt={this.props.tokenConfig.description ? 2 : 0}
                              borderTop={`1px solid ${this.props.theme.colors.divider}`}
                            >
                              <Flex
                                alignItems={'center'}
                                flexDirection={'row'}
                              >
                                <Text
                                  mr={1}
                                  fontSize={'15px'}
                                  color={'cellText'}
                                  fontWeight={[2,3]}
                                >
                                  Last harvest date:
                                </Text>
                                <ExtLink
                                  href={this.functionsUtil.getEtherscanTransactionUrl(this.state.lastHarvest.transactionHash)}
                                >
                                  <Flex
                                    alignItems={'center'}
                                    flexDirection={'row'}
                                  >
                                    <Text
                                      fontWeight={2}
                                      fontSize={'15px'}
                                    >
                                      {this.functionsUtil.strToMoment(this.state.lastHarvest.timestamp*1000).utc().format("MMM DD YYYY HH:mm")} UTC
                                    </Text>
                                    <Icon
                                      ml={1}
                                      size={'1.1em'}
                                      name={'OpenInNew'}
                                      color={'copyColor'}
                                    />
                                  </Flex>
                                </ExtLink>
                              </Flex>
                              <Flex
                                mt={1}
                                flexDirection={'row'}
                              >
                                <Text
                                  mr={1}
                                  fontSize={'15px'}
                                  color={'cellText'}
                                  fontWeight={[2,3]}
                                >
                                  Last harvest amount:
                                </Text>
                                <Text
                                  fontWeight={2}
                                  fontSize={'15px'}
                                >
                                  {this.functionsUtil.fixTokenDecimals(this.state.lastHarvest.amount,this.props.tokenConfig.decimals).toFixed(8)} {this.props.tokenConfig.token}
                                </Text>
                              </Flex>
                            </Flex>
                          )
                        }
                      </Flex>
                    )
                  }
                </DashboardCard>
              </Box>
              {
                /*
                this.props.selectedTranche === 'AA' && this.functionsUtil.BNify(this.state.gaugeStakedBalance).gt(0) && (
                  <IconBox
                    cardProps={{
                      p:2,
                      mt:2,
                      mb:2,
                      width:1,
                    }}
                    isActive={true}
                    isInteractive={false}
                    iconProps={{
                      size:'1.8em',
                      color:'primary'
                    }}
                    icon={'AssignmentLate'}
                    textProps={{
                      fontWeight:500,
                      color:'flashColor',
                      textAlign:'center',
                      fontSize:['13px','15px']
                    }}
                    text={`To withdraw your ${this.props.selectedToken} you need to unstake the tranche tokens from the <a href="${this.functionsUtil.getDashboardSectionUrl(`gauges/${this.props.selectedToken}`)}" class="link">${this.props.selectedToken} Gauge</a> first.`}
                  />
                ) :*/
                /*
                !this.props.tokenConfig.adaptiveYieldSplitEnabled && (
                  <IconBox
                    cardProps={{
                      p:2,
                      mt:2,
                      mb:2,
                      width:1,
                    }}
                    isActive={true}
                    isInteractive={false}
                    iconProps={{
                      size:'1.8em',
                      color:'primary'
                    }}
                    icon={'AssignmentLate'}
                    textProps={{
                      fontWeight:500,
                      color:'flashColor',
                      textAlign:'center',
                      fontSize:['13px','15px']
                    }}
                    text={`To improve the capital efficiency of tranches, the apy ratio will be updated to the new Adaptive Yield Split on Wed July 20th. No action required. Read more in the <a href="https://gov.idle.finance/t/adaptive-yield-split-implementation-for-existing-pyts/1019" target="_blank" rel="nofollow noopener noreferrer" class="link">Forum Proposal</a>.`}
                  />
                )
                */
              }
              <Box
                width={1}
              >
                <Text
                  mb={1}
                >
                  Select Action:
                </Text>
                <Flex
                  alignItems={'center'}
                  flexDirection={['column','row']}
                  justifyContent={'space-between'}
                >
                  <ImageButton
                    buttonProps={{
                      mx:0,
                      border:0
                    }}
                    caption={'Deposit'}
                    width={[1,'32%']}
                    isMobile={this.props.isMobile}
                    imageSrc={'images/deposit.png'}
                    imageProps={{
                      mb:[0,2],
                      height:this.props.isMobile ? '42px' : '52px'
                    }}
                    isActive={isDeposit}
                    handleClick={ e => this.setSelectedAction('deposit') }
                  />
                  <ImageButton
                    buttonProps={{
                      mx:0,
                      border:0,
                      disabled:!this.state.stakingEnabled && !this.props.gaugeConfig
                    }}
                    width={[1,'32%']}
                    caption={'Stake / Unstake'}
                    imageSrc={'images/stake.svg'}
                    isMobile={this.props.isMobile}
                    imageProps={{
                      mb:[0,2],
                      height:this.props.isMobile ? '42px' : '45px'
                    }}
                    isActive={isStake}
                    handleClick={ e => this.setSelectedAction('stake') }
                  />
                  <ImageButton
                    buttonProps={{
                      mx:0,
                      border:0
                    }}
                    width={[1,'32%']}
                    caption={'Withdraw'}
                    imageSrc={'images/upload.svg'}
                    isMobile={this.props.isMobile}
                    imageProps={{
                      mb:[0,2],
                      height:this.props.isMobile ? '42px' : '52px'
                    }}
                    isActive={isWithdraw}
                    handleClick={ e => this.setSelectedAction('withdraw') }
                  />
                </Flex>
              </Box>
              {
                isStake && this.state.stakingEnabled && (
                  <Box
                    mb={2}
                    width={1}
                  >
                    <Text mb={1}>
                      Choose stake action:
                    </Text>
                    <Flex
                      alignItems={'center'}
                      flexDirection={'row'}
                      justifyContent={'space-between'}
                    >
                      <CardIconButton
                        {...this.props}
                        textProps={{
                          fontSize:[1,2]
                        }}
                        cardProps={{
                          px:3,
                          py:2,
                          width:0.49
                        }}
                        text={'Stake'}
                        icon={'Layers'}
                        iconColor={'deposit'}
                        iconBgColor={'#ced6ff'}
                        handleClick={ e => this.setStakeAction('stake') }
                        isActive={ this.state.selectedStakeAction === 'stake' }
                      />
                      <CardIconButton
                        {...this.props}
                        textProps={{
                          fontSize:[1,2]
                        }}
                        cardProps={{
                          px:3,
                          py:2,
                          width:0.49
                        }}
                        text={'Unstake'}
                        icon={'LayersClear'}
                        iconColor={'redeem'}
                        iconBgColor={'#ceeff6'}
                        isDisabled={ !this.state.unstakeEnabled }
                        isActive={ this.state.selectedStakeAction === 'unstake' }
                        handleClick={ e => this.state.unstakeEnabled ? this.setStakeAction('unstake') : null }
                      />
                    </Flex>
                  </Box>
                )
              }
              {
                this.state.infoText && this.props.account && !this.state.contractPaused && !this.state.maxPoolUtilizationRateReached && (
                  <IconBox
                    cardProps={{
                      p:2,
                      mt:3,
                      mb:2,
                      width:1,
                    }}
                    isActive={true}
                    isInteractive={false}
                    iconProps={{
                      size:'1.2em',
                      color:'primary'
                    }}
                    textProps={{
                      fontWeight:500,
                      color:'flashColor',
                      textAlign:'center',
                      fontSize:['13px','15px']
                    }}
                    icon={'LightbulbOutline'}
                    text={this.state.infoText}
                  />
                )
              }
              {
                this.state.claimedNFTAmount ? (
                  <IconBox
                    cardProps={{
                      my:2,
                      width:1
                    }}
                    icon={'DoneAll'}
                    iconProps={{
                      color:this.props.theme.colors.transactions.status.completed
                    }}
                    text={`You have successfully claimed ${this.state.claimedNFTAmount.toFixed(4)} ${this.props.tokenConfig.token}!`}
                  />
                ) : this.state.pendingNFTAmounts && this.state.pendingNFTAmounts['available'] && this.state.pendingNFTAmounts['available'].amount.gt(0) ? (
                  <IconBox
                    cardProps={{
                      my:2,
                      width:1
                    }}
                    icon={'DoneAll'}
                    iconProps={{
                      color:this.props.theme.colors.transactions.status.completed
                    }}
                    text={`Your redeem NFT (ID: ${this.state.pendingNFTAmounts['available'].tokenIds[0]}) for a total amount of <strong>${this.state.pendingNFTAmounts['available'].amount.toFixed(4)} ${this.props.tokenConfig.token}</strong> is now available for claim.`}
                  >
                    <ExecuteTransaction
                      {...this.props}
                      Component={RoundButton}
                      parentProps={{
                        mt:3,
                        width:1,
                        alignItems:'center',
                        justifyContent:'center'
                      }}
                      componentProps={{
                        buttonProps:{
                          size:'medium',
                          width:[1,1/3],
                        },
                        value:`Claim ${this.state.pendingNFTAmounts['available'].amount.toFixed(4)} ${this.props.tokenConfig.token}`
                      }}
                      action={'Claim NFT'}
                      eventData={this.state.eventData}
                      callback={this.claimNFTSucceeded.bind(this)}
                      methodName={this.props.tokenConfig.ClaimNFT.method}
                      contractName={this.props.tokenConfig.ClaimNFT.contract}
                      params={[this.state.pendingNFTAmounts['available'].tokenIds[0]]}
                    />
                  </IconBox>
                ) : this.state.pendingNFTAmounts && this.state.pendingNFTAmounts['pending'] && this.state.pendingNFTAmounts['pending'].amount.gt(0) && (
                  <IconBox
                    cardProps={{
                      my:2,
                      width:1
                    }}
                    icon={'AccessTime'}
                    text={`You have a pending amount of ${this.state.pendingNFTAmounts['pending'].amount.toFixed(4)} ${this.props.tokenConfig.token} to withdraw. Please wait approximately until ${this.state.pendingNFTAmounts['pending'].maxUnlockDate.utc().format('DD MMM, YYYY @ HH:mm')} UTC to claim your funds.<br /><a href="https://docs.polygon.lido.fi/how-lido-on-polygon-works/#unstake-tokens" class="link" rel="nofollow noopener noreferrer" target="_blank">Read more</a>`}
                  />
                )
              }
              {
                showReferral && (
                  <IconBox
                    cardProps={{
                      py: 3,
                      px: 2,
                      mt: 3,
                      width:1,
                    }}
                    icon={'Share'}
                    isActive={false}
                    isInteractive={false}
                    iconProps={{
                      size:'1.8em',
                      color:'cellText'
                    }}
                  >
                    <Flex
                      width={1}
                      flexDirection={'column'}
                    >
                      <Text
                        mt={1}
                        px={2}
                        fontSize={1}
                        color={'cellText'}
                        textAlign={'center'}
                      >
                        You are depositing with the following referral address:
                      </Text>
                      <Text
                        mt={1}
                        px={2}
                        fontSize={1}
                        fontWeight={500}
                        textAlign={'center'}
                        color={this.props.theme.colors.transactions.status.completed}
                      >
                        {_referral}
                      </Text>
                    </Flex>
                  </IconBox>
                )
              }
              {
                this.state.maxPoolUtilizationRateReached && unlentAmount.gt(0) && (
                  <IconBox
                    cardProps={{
                      mt: 2
                    }}
                    icon={'Warning'}
                    text={maxPoolUtilizationRateReachedText}
                  />
                )
              }
              <Flex
                width={1}
                alignItems={'stretch'}
                flexDirection={'column'}
                justifyContent={'center'}
              >
                {
                  this.state.contractPaused && (this.state.selectedAction !== 'withdraw' || !withdrawEnabled) ? (
                    <IconBox
                      cardProps={{
                        mt: 2
                      }}
                      icon={'Warning'}
                      text={`Deposits${!withdrawEnabled ? '/Withdraws' : '' } for this tranche are temporarily suspended due to Smart-Contract maintenance.${withdrawEnabled && ' Withdrawals remain enabled.'}`}
                    />
                  ) : this.state.maxPoolUtilizationRateReached && (this.state.selectedAction !== 'withdraw' || unlentAmount.lte(0)) ? (
                    <IconBox
                      cardProps={{
                        mt: 2
                      }}
                      icon={'Warning'}
                      text={maxPoolUtilizationRateReachedText}
                    />
                  ) : isDisabled && (isDeposit || (isStake && this.state.selectedStakeAction === 'stake')) ? (
                    <IconBox
                      cardProps={{
                        mt: 2
                      }}
                      icon={'Warning'}
                      text={`Deposits have been disabled for this tranche, please redeem your funds.`}
                    >
                      <RoundButton
                        buttonProps={{
                          mt:2,
                          width:[1,1/2]
                        }}
                        handleClick={ e => this.setSelectedAction('withdraw') }
                      >
                        Redeem
                      </RoundButton>
                    </IconBox>
                  ) : isStake && this.state.selectedStakeAction === 'stake' && this.props.gaugeConfig ? (
                    <IconBox
                      cardProps={{
                        mt: 2
                      }}
                      icon={'LightbulbOutline'}
                      text={`To earn additional staking rewards deposit your tranche token in the <a href="${this.functionsUtil.getDashboardSectionUrl(`gauges/${this.props.selectedToken}`)}" class="link">${this.functionsUtil.capitalize(this.props.tokenConfig.protocol)} ${this.props.selectedToken} Gauge</a>.`}
                    >
                      <RoundButton
                        buttonProps={{
                          mt:2,
                          width:[1,1/2]
                        }}
                        handleClick={e => this.props.goToSection(`gauges/${this.props.selectedToken}`)}
                      >
                        Go to Gauge
                      </RoundButton>
                    </IconBox>
                  ) : ((isStake && !this.state.stakingEnabled) || (isStake && this.state.selectedStakeAction === 'stake' && !this.state.stakeEnabled)) ? (
                    <DashboardCard
                      cardProps={{
                        p: 2,
                        mt: 2
                      }}
                    >
                      <Flex
                        width={1}
                        alignItems={'center'}
                        flexDirection={'column'}
                        justifyContent={'center'}
                      >
                        <Icon
                          size={'1.8em'}
                          color={'cellText'}
                          name={'DoNotDisturb'}
                        />
                        <Text
                          mt={1}
                          color={'cellText'}
                          textAlign={'center'}
                        >
                          Staking is not enabled for this Tranche.
                        </Text>
                      </Flex>
                    </DashboardCard>
                  ) : isStake && this.state.selectedStakeAction === 'unstake' && !this.props.trancheConfig.CDORewards.unstakeWithBalance ? (
                    <DashboardCard
                      cardProps={{
                        p: 2,
                        pb: 3,
                        mt: 3
                      }}
                    >
                      {
                        this.state.stakedBalance.gt(0) ? (
                          <Flex
                            alignItems={'center'}
                            flexDirection={'column'}
                          >
                            <Icon
                              size={'1.8em'}
                              color={'cellText'}
                              name={'MonetizationOn'}
                            />
                            <Text
                              mt={1}
                              mb={3}
                              fontSize={[2,3]}
                              color={'cellText'}
                              textAlign={'center'}
                            >
                              You can unstake <strong>{this.state.stakedBalance.toFixed(8)} {this.state.tokenConfig.label}</strong>.
                            </Text>
                            <ExecuteTransaction
                              params={[]}
                              {...this.props}
                              Component={RoundButton}
                              parentProps={{
                                width:1,
                                alignItems:'center',
                                justifyContent:'center'
                              }}
                              componentProps={{
                                value:'Unstake',
                                buttonProps:{
                                  size:'medium',
                                  width:[1,1/3],
                                }
                              }}
                              action={'Unstake'}
                              eventData={this.state.eventData}
                              contractName={this.state.contractInfo.name}
                              callback={this.transactionSucceeded.bind(this)}
                              methodName={this.props.trancheConfig.functions.unstake}
                            />
                          </Flex>
                        ) : (
                          <Flex
                            width={1}
                            alignItems={'center'}
                            flexDirection={'column'}
                            justifyContent={'center'}
                          >
                            <Icon
                              size={'1.8em'}
                              color={'cellText'}
                              name={'MoneyOff'}
                            />
                            <Text
                              mt={1}
                              color={'cellText'}
                              textAlign={'center'}
                            >
                              You don't have any <strong>{this.state.tokenConfig.label}</strong> to unstake.
                            </Text>
                          </Flex>
                        )
                      }
                    </DashboardCard>
                  ) : (
                    <SendTxWithBalance
                      error={null}
                      {...this.props}
                      buttonProps={{
                        width:[1,0.45]
                      }}
                      permitEnabled={false}
                      eventData={this.state.eventData}
                      tokenConfig={this.state.tokenConfig}
                      tokenBalance={this.state.balanceProp}
                      contractInfo={this.state.contractInfo}
                      checkLimit={this.checkLimit.bind(this)}
                      approveEnabled={this.state.approveEnabled}
                      buttonDisabled={this.state.buttonDisabled}
                      callback={this.transactionSucceeded.bind(this)}
                      approveDescription={this.state.approveDescription}
                      balanceSelectorInfo={this.state.balanceSelectorInfo}
                      changeInputCallback={this.changeInputCallback.bind(this)}
                      contractApproved={this.contractApprovedCallback.bind(this)}
                      getTransactionParams={this.getTransactionParams.bind(this)}
                      action={this.functionsUtil.capitalize(this.state.actionLabel)}
                    >
                      {
                        isDeposit ? (
                          <IconBox
                            cardProps={{
                              my:2,
                              width:1
                            }}
                            icon={'MoneyOff'}
                            text={`You don't have any ${this.props.selectedToken} in your wallet.`}
                          />
                        ) : isStake ? (
                          <DashboardCard
                            cardProps={{
                              p: 2,
                              my: 2
                            }}
                          >
                            <Flex
                              width={1}
                              alignItems={'center'}
                              flexDirection={'column'}
                              justifyContent={'center'}
                            >
                              <Icon
                                size={'1.8em'}
                                name={'MoneyOff'}
                                color={'cellText'}
                              />
                              <Text
                                mt={1}
                                color={'cellText'}
                                textAlign={'center'}
                              >
                                You don't have any <strong>{this.state.tokenConfig.label}</strong> token to {this.state.selectedStakeAction}.
                              </Text>
                            </Flex>
                          </DashboardCard>
                        ) : isWithdraw && (
                          <DashboardCard
                            cardProps={{
                              p: 2,
                              my: 2
                            }}
                          >
                            <Flex
                              width={1}
                              alignItems={'center'}
                              flexDirection={'column'}
                              justifyContent={'center'}
                            >
                              <Icon
                                size={'1.8em'}
                                name={'MoneyOff'}
                                color={'cellText'}
                              />
                              <Text
                                mt={1}
                                color={'cellText'}
                                textAlign={'center'}
                              >
                                You don't have any {this.props.selectedToken} to withdraw.<br />If you have staked your <strong>{this.state.tokenConfig.label}</strong> tokens please unstake them to be able to withdraw your {this.props.selectedToken}.
                            </Text>
                            </Flex>
                          </DashboardCard>
                        )
                      }
                    </SendTxWithBalance>
                  )
                }
              </Flex>
              <LimitReachedModal
                {...this.props}
                limit={trancheLimit}
                closeModal={this.resetModal}
                isOpen={this.state.activeModal === 'limit'}
              />
              <ShareModal
                confettiEnabled={true}
                icon={`images/medal.svg`}
                title={`Congratulations!`}
                account={this.props.account}
                closeModal={this.resetModal}
                tokenName={this.props.selectedToken}
                isOpen={this.state.activeModal === 'share'}
                text={`You have successfully ${this.state.modalAction} in Idle!<br />Enjoy <strong>${this.state.modalApy ? this.state.modalApy.toFixed(2) : '0.00'}% APY</strong> on your <strong>${this.props.selectedToken}</strong>!`+(this.props.gaugeConfig ? `<br />Stake your tranche tokens in the <a href="${this.functionsUtil.getDashboardSectionUrl(`gauges/${this.props.selectedToken}`)}" class="link">${this.functionsUtil.capitalize(this.props.tokenConfig.protocol)} ${this.props.selectedToken} Gauge</a> to get additional rewards!` : ``)}
                tweet={`I'm earning ${this.state.modalApy ? this.state.modalApy.toFixed(2) : '0.00'}% APY on my ${this.props.selectedToken} with @idlefinance tranches! Go to ${this.functionsUtil.getGlobalConfig(['baseURL'])}${this.props.selectedSection.route} and start earning now from your idle tokens!`}
              />
              {
                modalEnabled && (
                  <GenericModal
                    {...this.props.tokenConfig.modal}
                    closeModal={this.resetModal}
                    isOpen={this.state.activeModal === this.props.tokenConfig.modal.id}
                  />
                )
              }
            </Flex>
          )
        }
      </Flex>
    );
  }
}

export default TrancheDetails;
