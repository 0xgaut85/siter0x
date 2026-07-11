import React from 'react';

import windowResize from './windowResize.png';
import maximize from './maximize.png';
import minimize from './minimize.png';
import computerBig from './computerBig.png';
import computerSmall from './computerSmall.png';
import myComputer from './myComputer.png';
import showcaseIcon from './showcaseIcon.png';
import doomIcon from './doomIcon.png';
import henordleIcon from './henordleIcon.png';
import credits from './credits.png';
import volumeOn from './volumeOn.png';
import volumeOff from './volumeOff.png';
import trailIcon from './trailIcon.png';
import windowGameIcon from './windowGameIcon.png';
import windowExplorerIcon from './windowExplorerIcon.png';
import windowR0xExplorerIcon from './windowR0xExplorerIcon.png';
import windowsStartIcon from './windowsStartIcon.png';
import scrabbleIcon from './scrabbleIcon.png';
import close from './close.png';
import agentIcon from './agentIcon.png';
import videoIcon from './videoIcon.png';
import windowVideoIcon from './windowVideoIcon.png';
import walletIcon from './walletIcon.png';
import windowWalletIcon from './windowWalletIcon.png';
import serverIcon from './serverIcon.png';
import windowServerIcon from './windowServerIcon.png';
import facilitatorIcon from './facilitatorIcon.png';
import windowFacilitatorIcon from './windowFacilitatorIcon.png';
import pinionTokenIcon from './pinionTokenIcon.png';

const icons = {
    windowResize: windowResize,
    maximize: maximize,
    minimize: minimize,
    computerBig: computerBig,
    computerSmall: computerSmall,
    myComputer: myComputer,
    showcaseIcon: showcaseIcon,
    doomIcon: doomIcon,
    volumeOn: volumeOn,
    volumeOff: volumeOff,
    credits: credits,
    scrabbleIcon: scrabbleIcon,
    henordleIcon: henordleIcon,
    close: close,
    windowGameIcon: windowGameIcon,
    windowExplorerIcon: windowExplorerIcon,
    windowR0xExplorerIcon: windowR0xExplorerIcon,
    windowsStartIcon: windowsStartIcon,
    trailIcon: trailIcon,
    agentIcon: agentIcon,
    videoIcon: videoIcon,
    windowVideoIcon: windowVideoIcon,
    walletIcon: walletIcon,
    windowWalletIcon: windowWalletIcon,
    serverIcon: serverIcon,
    windowServerIcon: windowServerIcon,
    facilitatorIcon: facilitatorIcon,
    windowFacilitatorIcon: windowFacilitatorIcon,
    pinionTokenIcon: pinionTokenIcon,
};

export type IconName = keyof typeof icons;

const getIconByName = (
    iconName: IconName
    // @ts-ignore
): React.FC<React.SVGAttributes<SVGElement>> => icons[iconName];

export default getIconByName;
