// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n } from '@aws-amplify/core';

interface IFooterProps {
    pageTitle: string;
}

export default function Footer(props: IFooterProps): JSX.Element {
    const helpLink = props.pageTitle.includes('Create') ?
        'https://docs.aws.amazon.com/solutions/latest/iot-device-simulator/deployment.html' :
        'https://aws.amazon.com/solutions/implementations/iot-device-simulator/';

    const helpPage = props.pageTitle.includes('Create') ? I18n.get('footer.solution.ig') : I18n.get('footer.solution.page');

    return (
        <div className="footer">
            <p>{I18n.get('footer.help')}&nbsp;
                <a
                    className="text-link" href={helpLink}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {helpPage}&nbsp;
                    <i className="bi bi-box-arrow-up-right" />
                </a>
            </p>
        </div>
    );
}