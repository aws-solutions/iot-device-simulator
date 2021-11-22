// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n } from '@aws-amplify/core';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

interface IDeleteConfirmProps {
    id: string;
    name: string;
    delete: (id: string, index: number) => void;
    showModal: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean;
    index: number;
}

export default function DeleteConfirm(props: IDeleteConfirmProps): JSX.Element {

    /**
     * Deletes the provided item
     * @param id - the id of the item to delete
     * @param index - the index of the item to delete
     */
    const deleteItem = (id: string, index: number) => {
        props.delete(id, index);
        props.showModal(false);
    }

    return (
        <Modal show={props.show} onHide={() => { props.showModal(false) }}>
            <Modal.Header closeButton>
                <Modal.Title>
                    {I18n.get('confirm.delete.title')}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {I18n.get('confirm.delete.message')} "{props.name}"?
            </Modal.Body>
            <Modal.Footer>
                <Button
                    size="sm"
                    variant='secondary'
                    onClick={() => { props.showModal(false) }}
                >{I18n.get('cancel')}</Button>
                <Button
                    size="sm"
                    className='button-theme'
                    onClick={() => { deleteItem(props.id, props.index) }}
                >
                    {I18n.get('confirm')}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}