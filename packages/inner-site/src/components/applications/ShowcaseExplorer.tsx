import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '../showcase/Home';
import Overview from '../showcase/About';
import Window from '../os/Window';
import Architecture from '../showcase/Experience';
import Integrations from '../showcase/Projects';
import Developers from '../showcase/Contact';
import SkillsPage from '../showcase/projects/Skills';
import X402Page from '../showcase/projects/Music';
import ERC8004Page from '../showcase/projects/Art';
import VerticalNavbar from '../showcase/VerticalNavbar';
import useInitialWindowSize from '../../hooks/useInitialWindowSize';

export interface ShowcaseExplorerProps extends WindowAppProps {}

const ShowcaseExplorer: React.FC<ShowcaseExplorerProps> = (props) => {
    const { initWidth, initHeight } = useInitialWindowSize({ margin: 100 });

    return (
        <Window
            top={24}
            left={56}
            width={initWidth}
            height={initHeight}
            windowTitle="r0x OS - Protocol Explorer"
            windowBarIcon="windowExplorerIcon"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'© 2026 r0x'}
        >
            <Router basename={process.env.PUBLIC_URL || '/'}>
                <div className="site-page">
                    <VerticalNavbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/overview" element={<Overview />} />
                        <Route path="/architecture" element={<Architecture />} />
                        <Route path="/integrations" element={<Integrations />} />
                        <Route path="/developers" element={<Developers />} />
                        <Route
                            path="/integrations/skills"
                            element={<SkillsPage />}
                        />
                        <Route
                            path="/integrations/x402"
                            element={<X402Page />}
                        />
                        <Route
                            path="/integrations/erc8004"
                            element={<ERC8004Page />}
                        />
                    </Routes>
                </div>
            </Router>
        </Window>
    );
};

export default ShowcaseExplorer;
